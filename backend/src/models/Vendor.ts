import mongoose, { Schema, model, Document } from 'mongoose';

// Enums
export enum VerificationStatus {
  VERIFIED = 'verified',
  PENDING = 'pending',
  UNVERIFIED = 'unverified',
  REJECTED = 'rejected'
}

export enum PaymentMode {
  PLATFORM_STRIPE = 'platform_stripe', // Uses platform Stripe, pays commission
  CUSTOM_STRIPE = 'custom_stripe' // Uses own Stripe, pays subscription
}

export enum VendorSubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
  GRACE_PERIOD = 'grace_period'
}

// Interfaces
export interface IBusinessHours {
  [key: string]: {
    isOpen: boolean;
    openTime?: string;
    closeTime?: string;
  };
}

export interface ISocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  website?: string;
}

export interface IContactPerson {
  name: string;
  position?: string;
  email: string;
  phone: string;
}

export interface ITaxInformation {
  taxId?: string;
  businessType?: string; // LLC, Corporation, Sole Proprietorship, etc.
  registrationNumber?: string;
  vatNumber?: string;
}

export interface IBusinessAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface ILocation {
  city: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface IBankAccountDetails {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  iban?: string;
  swiftCode?: string;
  isVerified?: boolean;
}

export interface IStripeSettings {
  // Stripe Connect (preferred method)
  stripeConnectAccountId?: string;
  stripeConnectOnboardingComplete: boolean;
  stripeConnectCapabilities?: {
    card_payments?: string; // 'active', 'inactive', 'pending'
    transfers?: string;
  };

  // Manual Stripe keys (legacy/fallback)
  stripePublishableKey?: string; // pk_live_... or pk_test_... (safe for frontend)
  stripeSecretKey?: string; // sk_live_... or sk_test_... (encrypted, NEVER send to frontend)
  stripeTestMode: boolean;

  // Settings
  stripeKeysLastValidated?: Date;
  stripeKeysValidationError?: string;
}

export interface IPaymentSettings {
  // Payment mode
  paymentMode: PaymentMode;
  paymentModeChangedAt?: Date;
  paymentModeChangedBy?: mongoose.Types.ObjectId; // Admin who approved the change

  // Stripe settings
  stripeSettings: IStripeSettings;

  // Platform payments (commission model)
  commissionRate: number; // Percentage (default 5%)
  customCommissionRate?: number; // Negotiated rate if different from default
  commissionAgreements?: Array<{
    rate: number;
    startDate: Date;
    endDate?: Date;
    approvedBy: mongoose.Types.ObjectId; // Admin who approved
    notes?: string;
  }>;

  // Subscription model (for custom Stripe users)
  subscriptionStatus: VendorSubscriptionStatus;
  subscriptionAmount: number; // Monthly fee (default 150 AED)
  subscriptionStartDate?: Date;
  subscriptionPaidUntil?: Date;
  subscriptionHistory?: Array<{
    paymentDate: Date;
    amount: number;
    periodStart: Date;
    periodEnd: Date;
    status: 'paid' | 'failed' | 'pending' | 'refunded';
    transactionId?: string;
    invoiceUrl?: string;
  }>;

  // Payout settings
  payoutSchedule: 'daily' | 'weekly' | 'monthly';
  minimumPayout: number; // Minimum amount for payout
  preferredPayoutMethod: 'bank_transfer' | 'stripe' | 'paypal';
  bankAccountDetails?: IBankAccountDetails;

  // Flags
  acceptsPlatformPayments: boolean;
  autoPayoutEnabled: boolean;
}

export interface IVerificationDocuments {
  businessLicense?: {
    url: string;
    uploadedAt: Date;
    status: VerificationStatus;
  };
  taxCertificate?: {
    url: string;
    uploadedAt: Date;
    status: VerificationStatus;
  };
  identityDocument?: {
    url: string;
    uploadedAt: Date;
    status: VerificationStatus;
  };
}

// Vendor Document Interface
export interface IVendor extends Document {
  _id: mongoose.Types.ObjectId;

  // Reference to User
  userId: mongoose.Types.ObjectId;

  // Business Information
  businessName: string;
  description?: string;
  category?: string;
  logo?: string;
  coverImage?: string;

  // Contact Information
  email: string;
  phone: string;
  contactPerson?: IContactPerson;

  // Address
  address: IBusinessAddress;
  location?: ILocation;

  // Business Details
  businessHours?: IBusinessHours;
  socialMedia?: ISocialMedia;
  website?: string;

  // Tax & Legal
  taxInformation?: ITaxInformation;
  verificationDocuments?: IVerificationDocuments;

  // Payment Settings
  paymentSettings: IPaymentSettings;

  // Status & Verification
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  isActive: boolean;
  isSuspended: boolean;
  suspensionReason?: string;

  // Statistics (cached for performance)
  stats?: {
    totalEvents: number;
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
    lastCalculatedAt: Date;
  };

  // Timestamps
  memberSince: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  canSwitchToCustomStripe(): boolean;
  isSubscriptionActive(): boolean;
  getEffectiveCommissionRate(): number;
  needsSubscriptionPayment(): boolean;
}

// Vendor Schema
const VendorSchema = new Schema<IVendor>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },

    // Business Information
    businessName: {
      type: String,
      required: [true, 'Business name is required'],
      trim: true,
      maxlength: [100, 'Business name cannot be more than 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot be more than 2000 characters']
    },
    category: {
      type: String,
      trim: true
    },
    logo: {
      type: String
    },
    coverImage: {
      type: String
    },

    // Contact Information
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true
    },
    contactPerson: {
      name: {
        type: String,
        required: true
      },
      position: String,
      email: {
        type: String,
        required: true
      },
      phone: {
        type: String,
        required: true
      }
    },

    // Address
    address: {
      street: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      state: {
        type: String,
        required: true
      },
      zipCode: {
        type: String,
        required: true
      },
      country: {
        type: String,
        required: true,
        default: 'United Arab Emirates'
      }
    },

    location: {
      city: {
        type: String
      },
      address: {
        type: String
      },
      coordinates: {
        lat: Number,
        lng: Number
      }
    },

    // Business Details
    businessHours: {
      type: Object,
      default: {}
    },
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
      youtube: String,
      website: String
    },
    website: String,

    // Tax & Legal
    taxInformation: {
      taxId: String,
      businessType: String,
      registrationNumber: String,
      vatNumber: String
    },
    verificationDocuments: {
      businessLicense: {
        url: String,
        uploadedAt: Date,
        status: {
          type: String,
          enum: Object.values(VerificationStatus),
          default: VerificationStatus.PENDING
        }
      },
      taxCertificate: {
        url: String,
        uploadedAt: Date,
        status: {
          type: String,
          enum: Object.values(VerificationStatus),
          default: VerificationStatus.PENDING
        }
      },
      identityDocument: {
        url: String,
        uploadedAt: Date,
        status: {
          type: String,
          enum: Object.values(VerificationStatus),
          default: VerificationStatus.PENDING
        }
      }
    },

    // Payment Settings
    paymentSettings: {
      // Payment mode
      paymentMode: {
        type: String,
        enum: Object.values(PaymentMode),
        default: PaymentMode.PLATFORM_STRIPE
      },
      paymentModeChangedAt: Date,
      paymentModeChangedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },

      // Stripe settings
      stripeSettings: {
        // Stripe Connect
        stripeConnectAccountId: {
          type: String,
          sparse: true
        },
        stripeConnectOnboardingComplete: {
          type: Boolean,
          default: false
        },
        stripeConnectCapabilities: {
          card_payments: String,
          transfers: String
        },

        // Manual keys (legacy)
        stripePublishableKey: {
          type: String,
          sparse: true
        },
        stripeSecretKey: {
          type: String,
          sparse: true,
          select: false // NEVER include in queries by default
        },
        stripeTestMode: {
          type: Boolean,
          default: true
        },

        stripeKeysLastValidated: Date,
        stripeKeysValidationError: String
      },

      // Commission
      commissionRate: {
        type: Number,
        default: 5,
        min: 0,
        max: 100
      },
      customCommissionRate: Number,
      commissionAgreements: [{
        rate: Number,
        startDate: Date,
        endDate: Date,
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        notes: String
      }],

      // Subscription
      subscriptionStatus: {
        type: String,
        enum: Object.values(VendorSubscriptionStatus),
        default: VendorSubscriptionStatus.INACTIVE
      },
      subscriptionAmount: {
        type: Number,
        default: 150 // 150 AED per month
      },
      subscriptionStartDate: Date,
      subscriptionPaidUntil: Date,
      subscriptionHistory: [{
        paymentDate: Date,
        amount: Number,
        periodStart: Date,
        periodEnd: Date,
        status: {
          type: String,
          enum: ['paid', 'failed', 'pending', 'refunded']
        },
        transactionId: String,
        invoiceUrl: String
      }],

      // Payout settings
      payoutSchedule: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly'
      },
      minimumPayout: {
        type: Number,
        default: 50 // 50 AED minimum
      },
      preferredPayoutMethod: {
        type: String,
        enum: ['bank_transfer', 'stripe', 'paypal'],
        default: 'bank_transfer'
      },
      bankAccountDetails: {
        accountHolderName: String,
        bankName: String,
        accountNumber: String,
        routingNumber: String,
        iban: String,
        swiftCode: String,
        isVerified: {
          type: Boolean,
          default: false
        }
      },

      // Flags
      acceptsPlatformPayments: {
        type: Boolean,
        default: true
      },
      autoPayoutEnabled: {
        type: Boolean,
        default: false
      }
    },

    // Status & Verification
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      default: VerificationStatus.UNVERIFIED
    },
    verificationNotes: String,
    isActive: {
      type: Boolean,
      default: true
    },
    isSuspended: {
      type: Boolean,
      default: false
    },
    suspensionReason: String,

    // Statistics
    stats: {
      totalEvents: {
        type: Number,
        default: 0
      },
      totalBookings: {
        type: Number,
        default: 0
      },
      totalRevenue: {
        type: Number,
        default: 0
      },
      averageRating: {
        type: Number,
        default: 0
      },
      totalReviews: {
        type: Number,
        default: 0
      },
      lastCalculatedAt: Date
    },

    // Timestamps
    memberSince: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
// Note: userId already has unique:true which creates an index automatically
VendorSchema.index({ email: 1 });
VendorSchema.index({ verificationStatus: 1 });
VendorSchema.index({ isActive: 1, isSuspended: 1 });
VendorSchema.index({ 'paymentSettings.paymentMode': 1 });
VendorSchema.index({ 'paymentSettings.subscriptionStatus': 1 });
VendorSchema.index({ 'paymentSettings.subscriptionPaidUntil': 1 });
VendorSchema.index({ createdAt: -1 });
VendorSchema.index({ 'stats.totalRevenue': -1 });

// Method: Check if vendor can switch to custom Stripe
VendorSchema.methods.canSwitchToCustomStripe = function(): boolean {
  // Can switch if:
  // 1. Currently using platform Stripe
  // 2. Has Stripe Connect account or valid Stripe keys
  // 3. Is verified
  // 4. Is not suspended

  if (this.paymentSettings.paymentMode !== PaymentMode.PLATFORM_STRIPE) {
    return false;
  }

  if (this.isSuspended || !this.isActive) {
    return false;
  }

  if (this.verificationStatus !== VerificationStatus.VERIFIED) {
    return false;
  }

  const hasStripeConnect = this.paymentSettings.stripeSettings.stripeConnectOnboardingComplete;
  const hasManualKeys = this.paymentSettings.stripeSettings.stripePublishableKey &&
                        this.paymentSettings.stripeSettings.stripeSecretKey;

  return hasStripeConnect || hasManualKeys;
};

// Method: Check if subscription is active
VendorSchema.methods.isSubscriptionActive = function(): boolean {
  if (this.paymentSettings.paymentMode !== PaymentMode.CUSTOM_STRIPE) {
    return false;
  }

  const status = this.paymentSettings.subscriptionStatus;
  if (status === VendorSubscriptionStatus.ACTIVE || status === VendorSubscriptionStatus.GRACE_PERIOD) {
    return true;
  }

  // Check if paid until date is in the future
  if (this.paymentSettings.subscriptionPaidUntil) {
    return new Date(this.paymentSettings.subscriptionPaidUntil) > new Date();
  }

  return false;
};

// Method: Get effective commission rate
VendorSchema.methods.getEffectiveCommissionRate = function(): number {
  // If using custom Stripe with active subscription, commission is 0
  if (this.paymentSettings.paymentMode === PaymentMode.CUSTOM_STRIPE && this.isSubscriptionActive()) {
    return 0;
  }

  // Check for custom negotiated rate
  if (this.paymentSettings.customCommissionRate !== undefined) {
    return this.paymentSettings.customCommissionRate;
  }

  // Check for active commission agreement
  if (this.paymentSettings.commissionAgreements && this.paymentSettings.commissionAgreements.length > 0) {
    const now = new Date();
    const activeAgreement = this.paymentSettings.commissionAgreements.find(agreement => {
      const startDate = new Date(agreement.startDate);
      const endDate = agreement.endDate ? new Date(agreement.endDate) : null;

      return startDate <= now && (!endDate || endDate >= now);
    });

    if (activeAgreement) {
      return activeAgreement.rate;
    }
  }

  // Default commission rate
  return this.paymentSettings.commissionRate;
};

// Method: Check if needs subscription payment
VendorSchema.methods.needsSubscriptionPayment = function(): boolean {
  if (this.paymentSettings.paymentMode !== PaymentMode.CUSTOM_STRIPE) {
    return false;
  }

  // If never paid, needs payment
  if (!this.paymentSettings.subscriptionPaidUntil) {
    return true;
  }

  // Check if subscription expired
  const paidUntil = new Date(this.paymentSettings.subscriptionPaidUntil);
  const now = new Date();

  return paidUntil <= now;
};

// Pre-save middleware to update member since date
VendorSchema.pre('save', function(next) {
  if (this.isNew && !this.memberSince) {
    this.memberSince = new Date();
  }
  next();
});

// Create and export the Vendor model
const Vendor = mongoose.model<IVendor>('Vendor', VendorSchema);
export default Vendor;
