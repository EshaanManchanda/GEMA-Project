import { Schema, model, Document, Types } from 'mongoose';

// Venue type enum
export enum VenueType {
  INDOOR = 'indoor',
  OUTDOOR = 'outdoor',
  HYBRID = 'hybrid'
}

// Venue status enum
export enum VenueStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  SUSPENDED = 'suspended'
}

// Gate interface
export interface ICheckInGate {
  gateName: string;
  gateCode: string;
  isActive: boolean;
  assignedEmployees?: Types.ObjectId[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  description?: string;
}

// Access rules interface
export interface IAccessRule {
  ticketType: string;
  allowedGates?: string[];
  timeRestrictions?: {
    startTime: string;
    endTime: string;
  };
  specialConditions?: string[];
}

// Operating hours interface
export interface IOperatingHours {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface IVenue extends Document {
  // Basic Information
  name: string;
  description?: string;
  vendorId: Types.ObjectId;
  status: VenueStatus;
  
  // Location Details
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
  
  // Venue Details
  capacity: number;
  venueType: VenueType;
  facilities: string[];
  amenities?: string[];
  
  // Operating Information
  operatingHours: IOperatingHours[];
  timezone: string;
  
  // Check-in and Access
  checkInGates: ICheckInGate[];
  accessRules: IAccessRule[];
  
  // Contact and Services
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  wifiCredentials?: {
    ssid: string;
    password: string;
  };
  
  // Media
  images?: string[];
  virtualTourUrl?: string;
  
  // Pricing
  baseRentalPrice?: number;
  currency: string;
  
  // Compliance and Safety
  safetyFeatures?: string[];
  certifications?: string[];
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    expiryDate: Date;
  };
  
  // Analytics
  totalEvents: number;
  averageRating?: number;
  
  // Approval
  isApproved: boolean;

  // Affiliate Venue fields
  isAffiliateVenue: boolean;
  externalBookingLink?: string;
  affiliateClickTracking: {
    totalClicks: number;
    uniqueClicks: number;
    lastClickedAt?: Date;
  };
  claimStatus: 'unclaimed' | 'claimed' | 'not_claimable';
  claimedBy?: Types.ObjectId;
  claimedAt?: Date;
  originalAffiliateVendorId?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  isOperational: boolean;
  currentCapacityUtilization: number;
  
  // Methods
  addGate(gate: ICheckInGate): Promise<IVenue>;
  removeGate(gateCode: string): Promise<IVenue>;
  updateOperatingHours(hours: IOperatingHours[]): Promise<IVenue>;
  isOpenAt(dateTime: Date): boolean;
  getActiveGates(): ICheckInGate[];
}

const VenueSchema = new Schema<IVenue>({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Venue name is required'],
    trim: true,
    maxlength: [200, 'Venue name cannot exceed 200 characters'],
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  vendorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Vendor ID is required'],
  },
  status: {
    type: String,
    enum: Object.values(VenueStatus),
    default: VenueStatus.ACTIVE,
  },
  
  // Location Details
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
    },
    zipCode: {
      type: String,
      required: [true, 'Zip code is required'],
      trim: true,
    },
  },
  coordinates: {
    lat: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },
    lng: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
    },
  },
  
  // Venue Details
  capacity: {
    type: Number,
    required: [true, 'Venue capacity is required'],
    min: [1, 'Capacity must be at least 1'],
  },
  venueType: {
    type: String,
    enum: Object.values(VenueType),
    required: [true, 'Venue type is required'],
  },
  facilities: {
    type: [String],
    default: [],
    validate: {
      validator: function(v: string[]) {
        return v.length <= 50;
      },
      message: 'Cannot have more than 50 facilities',
    },
  },
  amenities: {
    type: [String],
    default: [],
  },
  
  // Operating Information
  operatingHours: [{
    day: {
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      required: true,
    },
    openTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Open time must be in HH:MM format'],
    },
    closeTime: {
      type: String,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Close time must be in HH:MM format'],
    },
    isClosed: {
      type: Boolean,
      default: false,
    },
  }],
  timezone: {
    type: String,
    default: 'UTC',
  },
  
  // Check-in and Access
  checkInGates: [{
    gateName: {
      type: String,
      required: [true, 'Gate name is required'],
      trim: true,
    },
    gateCode: {
      type: String,
      required: [true, 'Gate code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedEmployees: [{
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    }],
    coordinates: {
      lat: Number,
      lng: Number,
    },
    description: {
      type: String,
      maxlength: [200, 'Gate description cannot exceed 200 characters'],
    },
  }],
  accessRules: [{
    ticketType: {
      type: String,
      required: [true, 'Ticket type is required'],
      trim: true,
    },
    allowedGates: [String],
    timeRestrictions: {
      startTime: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'],
      },
      endTime: {
        type: String,
        match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'],
      },
    },
    specialConditions: [String],
  }],
  
  // Contact and Services
  contactInfo: {
    phone: {
      type: String,
      match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number'],
    },
    email: {
      type: String,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    website: {
      type: String,
      match: [/^https?:\/\/.+/, 'Please enter a valid website URL'],
    },
  },
  wifiCredentials: {
    ssid: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      select: false, // Don't include in normal queries for security
    },
  },
  
  // Media
  images: {
    type: [String],
    default: [],
    validate: {
      validator: function(v: string[]) {
        return v.length <= 20;
      },
      message: 'Cannot have more than 20 images',
    },
  },
  virtualTourUrl: {
    type: String,
    match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
  },
  
  // Pricing
  baseRentalPrice: {
    type: Number,
    min: [0, 'Base rental price cannot be negative'],
  },
  currency: {
    type: String,
    enum: ['AED', 'EGP', 'CAD', 'USD'],
    default: 'AED',
  },
  
  // Compliance and Safety
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
  
  // Analytics
  totalEvents: {
    type: Number,
    default: 0,
    min: 0,
  },
  averageRating: {
    type: Number,
    min: 0,
    max: 5,
  },
  
  // Approval
  isApproved: {
    type: Boolean,
    default: false,
  },

  // Affiliate Venue fields
  isAffiliateVenue: {
    type: Boolean,
    default: false,
  },
  externalBookingLink: {
    type: String,
    trim: true,
    validate: {
      validator: function(this: IVenue, v: string) {
        // If not an affiliate venue, external booking link is not required
        if (!this.isAffiliateVenue) return true;
        // If it's an affiliate venue, validate the URL format
        return v && /^https?:\/\/.+/.test(v);
      },
      message: 'External booking link is required for affiliate venues and must be a valid URL'
    }
  },
  affiliateClickTracking: {
    totalClicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueClicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastClickedAt: Date,
  },
  claimStatus: {
    type: String,
    enum: ['unclaimed', 'claimed', 'not_claimable'],
    default: 'not_claimable',
  },
  claimedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  claimedAt: Date,
  originalAffiliateVendorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
VenueSchema.index({ vendorId: 1 });
VenueSchema.index({ status: 1 });
VenueSchema.index({ isApproved: 1 });
VenueSchema.index({ venueType: 1 });
VenueSchema.index({ 'address.city': 1 });
VenueSchema.index({ 'address.country': 1 });
VenueSchema.index({ capacity: 1 });
VenueSchema.index({ averageRating: -1 });
VenueSchema.index({ totalEvents: -1 });
VenueSchema.index({ isAffiliateVenue: 1 });
VenueSchema.index({ claimStatus: 1 });

// Compound indexes
VenueSchema.index({ 'address.city': 1, venueType: 1, status: 1 });
VenueSchema.index({ vendorId: 1, status: 1 });
VenueSchema.index({ isApproved: 1, status: 1 });

// Text search index
VenueSchema.index({
  name: 'text',
  description: 'text',
  'address.city': 'text',
  'address.state': 'text',
  facilities: 'text',
});

// Virtual fields
VenueSchema.virtual('isOperational').get(function() {
  return this.status === VenueStatus.ACTIVE;
});

VenueSchema.virtual('currentCapacityUtilization').get(function() {
  // This would need to be calculated based on current events
  // For now, return 0 as placeholder
  return 0;
});

VenueSchema.virtual('fullAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}, ${this.address.country}`;
});

// Instance methods
VenueSchema.methods.addGate = function(gate: ICheckInGate) {
  this.checkInGates.push(gate);
  return this.save();
};

VenueSchema.methods.removeGate = function(gateCode: string) {
  this.checkInGates = this.checkInGates.filter((gate: ICheckInGate) => gate.gateCode !== gateCode);
  return this.save();
};

VenueSchema.methods.updateOperatingHours = function(hours: IOperatingHours[]) {
  this.operatingHours = hours;
  return this.save();
};

VenueSchema.methods.isOpenAt = function(dateTime: Date): boolean {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dateTime.getDay()];
  
  const daySchedule = this.operatingHours.find((h: IOperatingHours) => h.day === dayName);
  
  if (!daySchedule || daySchedule.isClosed) {
    return false;
  }
  
  const currentTime = dateTime.toTimeString().substring(0, 5); // HH:MM format
  return currentTime >= daySchedule.openTime && currentTime <= daySchedule.closeTime;
};

VenueSchema.methods.getActiveGates = function(): ICheckInGate[] {
  return this.checkInGates.filter((gate: ICheckInGate) => gate.isActive);
};

// Static methods
VenueSchema.statics.findByVendor = function(vendorId: Types.ObjectId) {
  return this.find({ vendorId, status: { $ne: VenueStatus.SUSPENDED } })
    .sort({ createdAt: -1 });
};

VenueSchema.statics.findByLocation = function(city: string, country?: string) {
  const query: any = { 'address.city': new RegExp(city, 'i') };
  if (country) {
    query['address.country'] = new RegExp(country, 'i');
  }
  return this.find(query).sort({ averageRating: -1 });
};

VenueSchema.statics.findOperational = function() {
  return this.find({ status: VenueStatus.ACTIVE });
};

const Venue = model<IVenue>('Venue', VenueSchema);

export default Venue;