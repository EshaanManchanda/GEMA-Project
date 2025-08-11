import mongoose, { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Enums
export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  VENDOR = 'vendor'
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
  street: string;
  city: string;
  state: string;
  zipCode: string;
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
  token: string;
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
      match: [/^(\+971|00971|0)?(?:50|51|52|55|56|58|2|3|4|6|7|9)\d{7}$/, 'Please enter a valid UAE phone number']
    },
    avatar: {
      type: String
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER
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
      token: String,
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
    }
  },
  {
    timestamps: true
  }
);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ 'socialLogins.provider': 1, 'socialLogins.providerId': 1 });

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
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Create and export the User model
const User = mongoose.model<IUser>('User', UserSchema);
export default User;