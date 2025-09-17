import mongoose, { Document, Schema } from 'mongoose';

export enum AddonType {
  PHOTOGRAPHY = 'photography',
  VIDEOGRAPHY = 'videography',
  CATERING = 'catering',
  TRANSPORTATION = 'transportation',
  EQUIPMENT_RENTAL = 'equipment_rental',
  DECORATION = 'decoration',
  ENTERTAINMENT = 'entertainment',
  SECURITY = 'security',
  CLEANING = 'cleaning',
  INSURANCE = 'insurance',
  GIFT_BAGS = 'gift_bags',
  CERTIFICATES = 'certificates',
  CUSTOM_SERVICE = 'custom_service'
}

export enum AddonStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued'
}

export enum PricingModel {
  FIXED = 'fixed',
  PER_PERSON = 'per_person',
  PER_HOUR = 'per_hour',
  PER_DAY = 'per_day',
  PERCENTAGE = 'percentage',
  TIERED = 'tiered'
}

export enum AvailabilityType {
  ALWAYS = 'always',
  SPECIFIC_DATES = 'specific_dates',
  ADVANCE_BOOKING = 'advance_booking',
  SEASONAL = 'seasonal'
}

export interface ITieredPricing {
  minQuantity: number;
  maxQuantity?: number;
  price: number;
  description?: string;
}

export interface IAddonRequirements {
  minimumNotice: number; // Hours
  maximumCapacity?: number;
  minimumAge?: number;
  maximumAge?: number;
  specialRequirements?: string[];
  equipmentProvided?: string[];
  equipmentRequired?: string[];
}

export interface IAvailabilitySchedule {
  type: AvailabilityType;
  specificDates?: Date[];
  advanceBookingHours?: number;
  seasonalMonths?: number[];
  daysOfWeek?: string[];
  timeSlots?: Array<{
    startTime: string;
    endTime: string;
  }>;
}

export interface IEventAddon extends Document {
  vendorId: mongoose.Types.ObjectId;

  // Basic addon information
  name: string;
  description: string;
  shortDescription?: string;
  type: AddonType;
  category: string;
  status: AddonStatus;

  // Pricing configuration
  pricingModel: PricingModel;
  basePrice: number;
  tieredPricing?: ITieredPricing[];
  currency: string;

  // Admin revenue settings
  adminCommissionRate: number;
  isAdminApprovalRequired: boolean;

  // Availability and booking
  availabilitySchedule: IAvailabilitySchedule;
  requirements: IAddonRequirements;
  maxBookingsPerDay?: number;
  maxConcurrentBookings?: number;

  // Content and media
  images: string[];
  videos?: string[];
  documents?: string[]; // Contracts, terms, etc.

  // Features and specifications
  features: string[];
  specifications?: {
    [key: string]: string | number | boolean;
  };

  // Location and service area
  serviceAreas: Array<{
    city: string;
    emirate?: string;
    deliveryFee?: number;
    serviceRadius?: number; // km
  }>;

  // Integration with events
  compatibleEventTypes: string[];
  minimumEventSize?: number;
  maximumEventSize?: number;

  // Terms and policies
  cancellationPolicy: {
    hoursBeforeEvent: number;
    refundPercentage: number;
    adminFee?: number;
  };
  termsAndConditions?: string;
  liability?: string;

  // Booking tracking
  totalBookings: number;
  monthlyBookings: number;
  revenue: number;
  lastBookedAt?: Date;

  // Quality and reviews
  averageRating: number;
  totalReviews: number;
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;

  // SEO and marketing
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  isFeatured: boolean;
  promotionalOffer?: {
    description: string;
    discountPercentage: number;
    validFrom: Date;
    validTo: Date;
    isActive: boolean;
  };

  // Admin and vendor management
  adminNotes?: string;
  vendorNotes?: string;
  lastModifiedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  isAvailable(date: Date, quantity?: number): boolean;
  calculatePrice(quantity: number, eventSize?: number): number;
  calculateAdminRevenue(totalPrice: number): number;
  canServiceLocation(city: string): boolean;
  updateBookingStats(bookingAmount: number): Promise<IEventAddon>;
  addReview(rating: number): Promise<IEventAddon>;
}

const EventAddonSchema = new Schema<IEventAddon>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Addon name is required'],
      trim: true,
      maxlength: [100, 'Addon name cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: [true, 'Addon description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    shortDescription: {
      type: String,
      maxlength: [200, 'Short description cannot exceed 200 characters']
    },
    type: {
      type: String,
      enum: Object.values(AddonType),
      required: [true, 'Addon type is required'],
      index: true
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(AddonStatus),
      default: AddonStatus.ACTIVE,
      required: true,
      index: true
    },
    pricingModel: {
      type: String,
      enum: Object.values(PricingModel),
      required: [true, 'Pricing model is required']
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative']
    },
    tieredPricing: [{
      minQuantity: {
        type: Number,
        required: true,
        min: [1, 'Minimum quantity must be at least 1']
      },
      maxQuantity: {
        type: Number,
        min: [1, 'Maximum quantity must be at least 1']
      },
      price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
      },
      description: {
        type: String,
        trim: true
      }
    }],
    currency: {
      type: String,
      required: true,
      enum: ['AED', 'USD', 'EUR', 'GBP'],
      default: 'AED'
    },
    adminCommissionRate: {
      type: Number,
      required: true,
      min: [0, 'Commission rate cannot be negative'],
      max: [50, 'Commission rate cannot exceed 50%'],
      default: 10 // 10% default commission on addons
    },
    isAdminApprovalRequired: {
      type: Boolean,
      default: true
    },
    availabilitySchedule: {
      type: {
        type: String,
        enum: Object.values(AvailabilityType),
        default: AvailabilityType.ALWAYS,
        required: true
      },
      specificDates: [Date],
      advanceBookingHours: {
        type: Number,
        min: [0, 'Advance booking hours cannot be negative'],
        default: 24
      },
      seasonalMonths: [{
        type: Number,
        min: [1, 'Month must be between 1-12'],
        max: [12, 'Month must be between 1-12']
      }],
      daysOfWeek: [String],
      timeSlots: [{
        startTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM']
        },
        endTime: {
          type: String,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format. Use HH:MM']
        }
      }]
    },
    requirements: {
      minimumNotice: {
        type: Number,
        required: true,
        min: [0, 'Minimum notice cannot be negative'],
        default: 24
      },
      maximumCapacity: {
        type: Number,
        min: [1, 'Maximum capacity must be at least 1']
      },
      minimumAge: {
        type: Number,
        min: [0, 'Minimum age cannot be negative']
      },
      maximumAge: {
        type: Number,
        min: [0, 'Maximum age cannot be negative']
      },
      specialRequirements: [String],
      equipmentProvided: [String],
      equipmentRequired: [String]
    },
    maxBookingsPerDay: {
      type: Number,
      min: [1, 'Max bookings per day must be at least 1']
    },
    maxConcurrentBookings: {
      type: Number,
      min: [1, 'Max concurrent bookings must be at least 1']
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 15;
        },
        message: 'Cannot have more than 15 images'
      }
    },
    videos: {
      type: [String],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 5;
        },
        message: 'Cannot have more than 5 videos'
      }
    },
    documents: {
      type: [String],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 10;
        },
        message: 'Cannot have more than 10 documents'
      }
    },
    features: {
      type: [String],
      default: [],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 20;
        },
        message: 'Cannot have more than 20 features'
      }
    },
    specifications: {
      type: Schema.Types.Mixed,
      default: {}
    },
    serviceAreas: [{
      city: {
        type: String,
        required: true,
        trim: true
      },
      emirate: {
        type: String,
        trim: true
      },
      deliveryFee: {
        type: Number,
        min: [0, 'Delivery fee cannot be negative'],
        default: 0
      },
      serviceRadius: {
        type: Number,
        min: [0, 'Service radius cannot be negative']
      }
    }],
    compatibleEventTypes: {
      type: [String],
      default: [],
      validate: {
        validator: function(v: string[]) {
          return v.length > 0;
        },
        message: 'At least one compatible event type is required'
      }
    },
    minimumEventSize: {
      type: Number,
      min: [1, 'Minimum event size must be at least 1']
    },
    maximumEventSize: {
      type: Number,
      min: [1, 'Maximum event size must be at least 1']
    },
    cancellationPolicy: {
      hoursBeforeEvent: {
        type: Number,
        required: true,
        min: [0, 'Hours before event cannot be negative'],
        default: 24
      },
      refundPercentage: {
        type: Number,
        required: true,
        min: [0, 'Refund percentage cannot be negative'],
        max: [100, 'Refund percentage cannot exceed 100%'],
        default: 100
      },
      adminFee: {
        type: Number,
        min: [0, 'Admin fee cannot be negative'],
        default: 0
      }
    },
    termsAndConditions: {
      type: String,
      maxlength: [5000, 'Terms and conditions cannot exceed 5000 characters']
    },
    liability: {
      type: String,
      maxlength: [2000, 'Liability clause cannot exceed 2000 characters']
    },
    totalBookings: {
      type: Number,
      default: 0,
      min: [0, 'Total bookings cannot be negative']
    },
    monthlyBookings: {
      type: Number,
      default: 0,
      min: [0, 'Monthly bookings cannot be negative']
    },
    revenue: {
      type: Number,
      default: 0,
      min: [0, 'Revenue cannot be negative']
    },
    lastBookedAt: Date,
    averageRating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: [0, 'Total reviews cannot be negative']
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    seoTitle: {
      type: String,
      maxlength: [60, 'SEO title cannot exceed 60 characters']
    },
    seoDescription: {
      type: String,
      maxlength: [160, 'SEO description cannot exceed 160 characters']
    },
    keywords: {
      type: [String],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 20;
        },
        message: 'Cannot have more than 20 keywords'
      }
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    promotionalOffer: {
      description: {
        type: String,
        maxlength: [200, 'Promotional description cannot exceed 200 characters']
      },
      discountPercentage: {
        type: Number,
        min: [0, 'Discount percentage cannot be negative'],
        max: [100, 'Discount percentage cannot exceed 100%']
      },
      validFrom: Date,
      validTo: Date,
      isActive: {
        type: Boolean,
        default: false
      }
    },
    adminNotes: {
      type: String,
      maxlength: [2000, 'Admin notes cannot exceed 2000 characters']
    },
    vendorNotes: {
      type: String,
      maxlength: [1000, 'Vendor notes cannot exceed 1000 characters']
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret: any) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for performance
EventAddonSchema.index({ vendorId: 1, status: 1 });
EventAddonSchema.index({ type: 1, status: 1 });
EventAddonSchema.index({ category: 1, status: 1 });
EventAddonSchema.index({ 'serviceAreas.city': 1 });
EventAddonSchema.index({ isFeatured: 1, status: 1 });
EventAddonSchema.index({ averageRating: -1 });
EventAddonSchema.index({ totalBookings: -1 });
EventAddonSchema.index({ createdAt: -1 });

// Text search index
EventAddonSchema.index({
  name: 'text',
  description: 'text',
  shortDescription: 'text',
  keywords: 'text'
});

// Method to check availability
EventAddonSchema.methods.isAvailable = function(date: Date, quantity: number = 1): boolean {
  if (this.status !== AddonStatus.ACTIVE) return false;

  const now = new Date();
  const timeDiff = date.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 3600);

  // Check minimum notice requirement
  if (hoursDiff < this.requirements.minimumNotice) return false;

  // Check capacity limits
  if (this.requirements.maximumCapacity && quantity > this.requirements.maximumCapacity) {
    return false;
  }

  // Check availability type
  switch (this.availabilitySchedule.type) {
    case AvailabilityType.ALWAYS:
      return true;

    case AvailabilityType.SPECIFIC_DATES:
      if (!this.availabilitySchedule.specificDates) return false;
      return this.availabilitySchedule.specificDates.some(
        availableDate => availableDate.toDateString() === date.toDateString()
      );

    case AvailabilityType.ADVANCE_BOOKING:
      const advanceHours = this.availabilitySchedule.advanceBookingHours || 24;
      return hoursDiff >= advanceHours;

    case AvailabilityType.SEASONAL:
      if (!this.availabilitySchedule.seasonalMonths) return true;
      return this.availabilitySchedule.seasonalMonths.includes(date.getMonth() + 1);

    default:
      return true;
  }
};

// Method to calculate price
EventAddonSchema.methods.calculatePrice = function(quantity: number, eventSize?: number): number {
  let price = 0;

  switch (this.pricingModel) {
    case PricingModel.FIXED:
      price = this.basePrice;
      break;

    case PricingModel.PER_PERSON:
      if (!eventSize) throw new Error('Event size required for per-person pricing');
      price = this.basePrice * eventSize;
      break;

    case PricingModel.PER_HOUR:
    case PricingModel.PER_DAY:
      price = this.basePrice * quantity;
      break;

    case PricingModel.PERCENTAGE:
      if (!eventSize) throw new Error('Event size required for percentage pricing');
      price = (this.basePrice / 100) * eventSize;
      break;

    case PricingModel.TIERED:
      if (this.tieredPricing && this.tieredPricing.length > 0) {
        const tier = this.tieredPricing.find(t =>
          quantity >= t.minQuantity && (!t.maxQuantity || quantity <= t.maxQuantity)
        );
        price = tier ? tier.price * quantity : this.basePrice * quantity;
      } else {
        price = this.basePrice * quantity;
      }
      break;

    default:
      price = this.basePrice * quantity;
  }

  // Apply promotional discount if active
  if (this.promotionalOffer?.isActive) {
    const now = new Date();
    if (this.promotionalOffer.validFrom <= now && this.promotionalOffer.validTo >= now) {
      price = price * (1 - this.promotionalOffer.discountPercentage / 100);
    }
  }

  return Math.round(price * 100) / 100; // Round to 2 decimal places
};

// Method to calculate admin revenue
EventAddonSchema.methods.calculateAdminRevenue = function(totalPrice: number): number {
  return (totalPrice * this.adminCommissionRate) / 100;
};

// Method to check if can service location
EventAddonSchema.methods.canServiceLocation = function(city: string): boolean {
  return this.serviceAreas.some(area =>
    area.city.toLowerCase() === city.toLowerCase()
  );
};

// Method to update booking statistics
EventAddonSchema.methods.updateBookingStats = async function(bookingAmount: number): Promise<IEventAddon> {
  this.totalBookings += 1;
  this.monthlyBookings += 1;
  this.revenue += bookingAmount;
  this.lastBookedAt = new Date();
  return this.save();
};

// Method to add review and update rating
EventAddonSchema.methods.addReview = async function(rating: number): Promise<IEventAddon> {
  const totalRating = this.averageRating * this.totalReviews + rating;
  this.totalReviews += 1;
  this.averageRating = totalRating / this.totalReviews;
  return this.save();
};

// Static method to find available addons for event
EventAddonSchema.statics.findAvailableForEvent = function(
  eventType: string,
  city: string,
  date: Date,
  eventSize?: number
) {
  const query: any = {
    status: AddonStatus.ACTIVE,
    compatibleEventTypes: eventType,
    'serviceAreas.city': { $regex: new RegExp(city, 'i') }
  };

  if (eventSize) {
    query.$and = [
      { $or: [{ minimumEventSize: { $exists: false } }, { minimumEventSize: { $lte: eventSize } }] },
      { $or: [{ maximumEventSize: { $exists: false } }, { maximumEventSize: { $gte: eventSize } }] }
    ];
  }

  return this.find(query).sort({ isFeatured: -1, averageRating: -1, totalBookings: -1 });
};

// Static method to find featured addons
EventAddonSchema.statics.findFeatured = function(limit: number = 10) {
  return this.find({
    status: AddonStatus.ACTIVE,
    isFeatured: true
  })
  .sort({ averageRating: -1, totalBookings: -1 })
  .limit(limit);
};

// Pre-save middleware to validate tiered pricing
EventAddonSchema.pre('save', function(next) {
  if (this.pricingModel === PricingModel.TIERED && this.tieredPricing) {
    // Sort tiered pricing by minimum quantity
    this.tieredPricing.sort((a, b) => a.minQuantity - b.minQuantity);

    // Validate no overlapping tiers
    for (let i = 0; i < this.tieredPricing.length - 1; i++) {
      const current = this.tieredPricing[i];
      const nextTier = this.tieredPricing[i + 1];

      if (current.maxQuantity && current.maxQuantity >= nextTier.minQuantity) {
        return next(new Error('Tiered pricing ranges cannot overlap'));
      }
    }
  }
  next();
});

// Pre-save middleware to validate service areas
EventAddonSchema.pre('save', function(next) {
  if (this.serviceAreas.length === 0) {
    return next(new Error('At least one service area is required'));
  }
  next();
});

const EventAddon = mongoose.model<IEventAddon>('EventAddon', EventAddonSchema);

export default EventAddon;