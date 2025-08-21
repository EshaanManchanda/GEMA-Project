import mongoose, { Document, Schema } from 'mongoose';

export interface IEvent extends Document {
  title: string;
  description: string;
  category: string;
  type: 'Event' | 'Course' | 'Venue';
  venueType: 'Indoor' | 'Outdoor';
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
  affiliateCode?: string;
  tags: string[];
  dateSchedule: Array<{
    date: Date;
    availableSeats: number;
    price: number;
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
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  hasAvailableSeats(date: Date, quantity?: number): boolean;
  reduceSeats(date: Date, quantity: number): boolean;
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
      enum: ['Event', 'Course', 'Venue'],
      required: [true, 'Event type is required'],
    },
    venueType: {
      type: String,
      enum: ['Indoor', 'Outdoor'],
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
        date: {
          type: Date,
          required: [true, 'Schedule date is required'],
        },
        availableSeats: {
          type: Number,
          required: [true, 'Available seats is required'],
          min: [0, 'Available seats cannot be negative'],
        },
        price: {
          type: Number,
          required: [true, 'Schedule price is required'],
          min: [0, 'Price cannot be negative'],
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
eventSchema.index({ category: 1 });
eventSchema.index({ type: 1 });
eventSchema.index({ 'location.city': 1 });
eventSchema.index({ price: 1 });
eventSchema.index({ currency: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ isFeatured: 1, isApproved: 1, isDeleted: 1 });
eventSchema.index({ tags: 1 });

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

// Pre-save middleware to generate affiliate code if not provided
eventSchema.pre('save', function (next) {
  if (!this.affiliateCode) {
    this.affiliateCode = `EVT-${(this._id as any).toString().slice(-8).toUpperCase()}`;
  }
  next();
});

// Method to check if event has available seats for a specific date
eventSchema.methods.hasAvailableSeats = function (date: Date, quantity: number = 1): boolean {
  const schedule = this.dateSchedule.find(
    (s: any) => s.date.toDateString() === date.toDateString()
  );
  return schedule ? schedule.availableSeats >= quantity : false;
};

// Method to reduce available seats
eventSchema.methods.reduceSeats = function (date: Date, quantity: number): boolean {
  const schedule = this.dateSchedule.find(
    (s: any) => s.date.toDateString() === date.toDateString()
  );
  
  if (schedule && schedule.availableSeats >= quantity) {
    schedule.availableSeats -= quantity;
    return true;
  }
  return false;
};

// Static method to find approved events
eventSchema.statics.findApproved = function () {
  return this.find({ isApproved: true, isDeleted: false });
};

// Static method to find events by vendor
eventSchema.statics.findByVendor = function (vendorId: string) {
  return this.find({ vendorId, isDeleted: false });
};

const Event = mongoose.model<IEvent>('Event', eventSchema);

export default Event;