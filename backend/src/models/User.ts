import mongoose, { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Enums
export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  EMPLOYEE = 'employee'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum SocialProvider {
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  APPLE = 'apple'
}

// Interfaces
export interface IAddress {
  label?: string; // e.g., "Home", "Office", "Work"
  street: string;
  city: string;
  state: string;
  zipCode: string;
  poBox?: string; // UAE P.O. Box number
  makaniNumber?: string; // UAE Emirates Post code (Makani)
  country: string;
  isDefault?: boolean;
}

export interface ISocialLogin {
  provider: SocialProvider;
  providerId: string;
}

export interface ITwoFactorAuth {
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
}


export interface IPasswordReset {
  token: string;
  expiresAt: Date;
}

export interface IEmailVerification {
  otp: string;
  expiresAt: Date;
}

export interface IPhoneVerification {
  code: string;
  expiresAt: Date;
}

export interface ILoginAttempt {
  timestamp: Date;
  ip: string;
  userAgent: string;
  success: boolean;
}

export interface INotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface IPreferences {
  language: string;
  currency: string;
  timezone: string;
  notifications: INotificationPreferences;
}

export interface ISocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
}

export interface IVendorPaymentSettings {
  hasCustomStripeAccount?: boolean;
  stripeAccountId?: string;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  subscriptionActive?: boolean;
  preferredPayoutMethod?: 'bank_transfer' | 'stripe' | 'paypal';
  minimumPayout?: number;
  payoutSchedule?: 'daily' | 'weekly' | 'monthly';
  bankAccountDetails?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    iban?: string;
    swiftCode?: string;
    isVerified?: boolean;
  };
}

// User Document Interface
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  gender?: Gender;
  dateOfBirth?: Date;
  addresses?: IAddress[];
  socialLogins?: ISocialLogin[];
  twoFactorAuth: ITwoFactorAuth;
  passwordReset?: IPasswordReset;
  emailVerification?: IEmailVerification;
  phoneVerification?: IPhoneVerification;
  loginAttempts?: ILoginAttempt[];
  lastLogin?: Date;
  firebaseUid?: string;
  favoriteEvents?: mongoose.Types.ObjectId[];
  preferences?: IPreferences;
  socialMedia?: ISocialMedia;
  vendorPaymentSettings?: IVendorPaymentSettings;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  comparePassword(password: string): Promise<boolean>;
  getFullName(): string;
}

// User Schema
const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot be more than 50 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot be more than 50 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },
    passwordHash: {
      type: String,
      required: function() {
        // Password is required if no social logins or firebase UID
        return !this.socialLogins?.length && !this.firebaseUid;
      }
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Phone is optional

          // Remove formatting characters (spaces, dashes, parentheses)
          const cleaned = v.replace(/[\s\-\(\)]/g, '');

          // Flexible phone validation - accepts both formats:
          // - International: +918377012270 (8-15 digits with + prefix)
          // - National: 08377012270 (8-15 digits without prefix)
          const internationalFormat = /^\+[1-9]\d{7,14}$/;
          const nationalFormat = /^[0-9]{8,15}$/;

          return internationalFormat.test(cleaned) || nationalFormat.test(cleaned);
        },
        message: 'Phone must be a valid phone number (8-15 digits, optionally with + prefix)'
      }
    },
    avatar: {
      type: String
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
      required: true
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.PENDING
    },
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    isPhoneVerified: {
      type: Boolean,
      default: false
    },
    gender: {
      type: String,
      enum: Object.values(Gender)
    },
    dateOfBirth: {
      type: Date
    },
    addresses: [
      {
        label: {
          type: String,
          trim: true
        },
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
          required: function(this: IAddress) {
            // zipCode is required only if poBox is not provided
            return !this.poBox;
          }
        },
        poBox: {
          type: String,
          trim: true,
          validate: {
            validator: function(v: string) {
              if (!v) return true; // Optional field
              // UAE P.O. Box format: typically 4-6 digits
              return /^\d{4,6}$/.test(v);
            },
            message: 'P.O. Box must be 4-6 digits for UAE addresses'
          }
        },
        makaniNumber: {
          type: String,
          trim: true,
          validate: {
            validator: function(v: string) {
              if (!v) return true; // Optional field
              // Makani number format: 10 digits
              return /^\d{10}$/.test(v);
            },
            message: 'Makani number must be 10 digits'
          }
        },
        country: {
          type: String,
          required: true
        },
        isDefault: {
          type: Boolean,
          default: false
        }
      }
    ],
    socialLogins: [
      {
        provider: {
          type: String,
          enum: Object.values(SocialProvider),
          required: true
        },
        providerId: {
          type: String,
          required: true
        }
      }
    ],
    twoFactorAuth: {
      enabled: {
        type: Boolean,
        default: false
      },
      secret: String,
      backupCodes: [String]
    },
    passwordReset: {
      token: String,
      expiresAt: Date
    },
    emailVerification: {
      otp: String,
      expiresAt: Date
    },
    phoneVerification: {
      code: String,
      expiresAt: Date
    },
    loginAttempts: [
      {
        timestamp: {
          type: Date,
          default: Date.now
        },
        ip: String,
        userAgent: String,
        success: Boolean
      }
    ],
    lastLogin: {
      type: Date
    },
    firebaseUid: {
      type: String,
      sparse: true
    },
    favoriteEvents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event'
    }],
    preferences: {
      language: {
        type: String,
        default: 'en'
      },
      currency: {
        type: String,
        default: 'AED'
      },
      timezone: {
        type: String,
        default: 'Asia/Dubai'
      },
      notifications: {
        email: {
          type: Boolean,
          default: true
        },
        sms: {
          type: Boolean,
          default: false
        },
        push: {
          type: Boolean,
          default: true
        }
      }
    },
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      linkedin: String,
      website: String
    },
    vendorPaymentSettings: {
      hasCustomStripeAccount: Boolean,
      stripeAccountId: String,
      stripePublishableKey: String,
      stripeSecretKey: String,
      subscriptionActive: Boolean,
      preferredPayoutMethod: {
        type: String,
        enum: ['bank_transfer', 'stripe', 'paypal']
      },
      minimumPayout: Number,
      payoutSchedule: {
        type: String,
        enum: ['daily', 'weekly', 'monthly']
      },
      bankAccountDetails: {
        accountHolderName: String,
        bankName: String,
        accountNumber: String,
        routingNumber: String,
        iban: String,
        swiftCode: String,
        isVerified: Boolean
      }
    }
  },
  {
    timestamps: true
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ 'socialLogins.provider': 1, 'socialLogins.providerId': 1 });

// Additional indexes for KVM1 optimization - faster admin dashboard queries
UserSchema.index({ role: 1, status: 1 }); // Admin user filtering by role and status
UserSchema.index({ status: 1, createdAt: -1 }); // Recent active users
UserSchema.index({ role: 1, isEmailVerified: 1 }); // Verified users by role
UserSchema.index({ createdAt: -1 }); // Recent signups (most common query)

// Virtual for full name
UserSchema.virtual('fullName').get(function(this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Method to compare password
UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

// Method to get full name
UserSchema.methods.getFullName = function(): string {
  return `${this.firstName} ${this.lastName}`;
};

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('passwordHash')) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password along with the new salt
    this.set('passwordHash', await bcrypt.hash(this.get('passwordHash'), salt));
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Create and export the User model
const User = mongoose.model<IUser>('User', UserSchema);
export default User;