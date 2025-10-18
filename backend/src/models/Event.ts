import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  category: string;
  type: 'Olympiad' | 'Championship' | 'Competition' | 'Event' | 'Course' | 'Venue';
  venueType: 'Indoor' | 'Outdoor' | 'Online' | 'Offline';
  ageRange: [number, number];
  location: {
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
  status: 'draft' | 'published' | 'archived' | 'pending' | 'rejected';
  affiliateCode?: string;
  tags: string[];
  dateSchedule: Array<{
    date?: Date; // Legacy field for backward compatibility
    startDate?: Date;
    endDate?: Date;
    availableSeats: number;
    totalSeats?: number;
    soldSeats?: number;
    reservedSeats?: number;
    price: number;
    unlimitedSeats?: boolean; // For online events with no capacity limit
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
  images: string[];
  isDeleted: boolean;
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
  createdAt: Date;
  updatedAt: Date;

  // Methods
  hasAvailableSeats(date: Date, quantity?: number): boolean;
  reduceSeats(date: Date, quantity: number): boolean;
  getEndDate(): Date | null;
  isExpired(): boolean;
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
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      required: [true, 'Event category is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['Olympiad', 'Championship', 'Competition', 'Event', 'Course', 'Venue'],
      required: [true, 'Event type is required'],
    },
    venueType: {
      type: String,
      enum: ['Indoor', 'Outdoor', 'Online', 'Offline'],
      required: [true, 'Venue type is required'],
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
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
      },
      coordinates: {
        lat: {
          type: Number,
          required: [true, 'Latitude is required'],
          min: [-90, 'Latitude must be between -90 and 90'],
          max: [90, 'Latitude must be between -90 and 90'],
        },
        lng: {
          type: Number,
          required: [true, 'Longitude is required'],
          min: [-180, 'Longitude must be between -180 and 180'],
          max: [180, 'Longitude must be between -180 and 180'],
        },
      },
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
      validate: {
        validator: function (v: string[]) {
          return v.length <= 10;
        },
        message: 'Cannot have more than 10 images',
      },
    },
    isDeleted: {
      type: Boolean,
      default: false,
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
eventSchema.index({ status: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ 'location.city': 1 });
eventSchema.index({ price: 1 });
eventSchema.index({ currency: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ isFeatured: 1, isApproved: 1, isDeleted: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ averageRating: -1 });
eventSchema.index({ reviewCount: -1 });
eventSchema.index({ averageRating: -1, reviewCount: -1 });

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

// Method to check if event has available seats for a specific date
eventSchema.methods.hasAvailableSeats = function (date: Date, quantity: number = 1): boolean {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    console.error('Invalid date provided to hasAvailableSeats:', date);
    return false;
  }

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0); // Normalize to start of day

  const schedule = this.dateSchedule.find((s: any) => {
    // Handle both legacy 'date' field and new 'startDate'/'endDate' fields
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
  });

  // Unlimited seats always have availability
  if (schedule && schedule.unlimitedSeats) {
    console.log('✓ Unlimited seats - no capacity check needed', {
      eventId: this._id,
      eventTitle: this.title,
      targetDate: targetDate.toISOString()
    });
    return true;
  }

  return schedule ? schedule.availableSeats >= quantity : false;
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

  const schedule = this.dateSchedule.find((s: any) => {
    // Handle both legacy 'date' field and new 'startDate'/'endDate' fields
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
  });

  // Unlimited seats - no need to reduce availability, just track sold count
  if (schedule && schedule.unlimitedSeats) {
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

  if (schedule && schedule.availableSeats >= quantity) {
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

  return this.find({
    isApproved: true,
    isActive: true,
    status: 'published',
    isDeleted: false,
    $or: [
      // New format: check endDate
      { 'dateSchedule.endDate': { $gte: now } },
      // Legacy format: check date field
      { 'dateSchedule.date': { $gte: now } },
    ],
    ...extraFilters
  });
};

const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event;