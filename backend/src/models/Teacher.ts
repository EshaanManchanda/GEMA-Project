import mongoose, { Schema, model, Document } from "mongoose";

/* ============================
   ENUMS
============================ */

export enum TeacherVerificationStatus {
  VERIFIED = "verified",
  PENDING = "pending",
  UNVERIFIED = "unverified",
  REJECTED = "rejected",
}

export enum TeachingMode {
  ONLINE = "online",
  OFFLINE = "offline",
  HYBRID = "hybrid",
}
export enum UAE_LANGUAGE {
  ENGLISH = "english",
  ARABIC = "arabic",
  HINDI = "hindi",
  URDU = "urdu",
  MALAYALAM = "malayalam",
  TAMIL = "tamil",
  TAGALOG = "tagalog",
  BENGALI = "bengali",
  PERSIAN = "persian",
  FRENCH = "french",
  GERMAN = "german",
  SPANISH = "spanish",
  CHINESE = "chinese",
  JAPANESE = "japanese",
  KOREAN = "korean",
  RUSSIAN = "russian",
  PORTUGUESE = "portuguese",
  ITALIAN = "italian",
  DUTCH = "dutch",
  TURKISH = "turkish",
  OTHER = "other",
}

export enum TeacherPaymentMode {
  PLATFORM_STRIPE = "platform_stripe",
  CUSTOM_STRIPE = "custom_stripe",
}

import { TeacherSubscriptionStatus } from "./TeacherSubscription";
export { TeacherSubscriptionStatus };

/* ============================
   INTERFACES
============================ */

export interface IQualification {
  degree: string;
  institution: string;
  year: number;
  country: string;
  certificateAssetId?: mongoose.Types.ObjectId;
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
  stripeSecretKey?: string;
  stripeTestMode: boolean;
}

export interface ITeacherPaymentSettings {
  paymentMode: TeacherPaymentMode;
  paymentModeChangedAt?: Date;
  paymentModeChangedBy?: mongoose.Types.ObjectId;

  stripeSettings: IStripeConfig;

  commissionRate: number;
  commissionConfigId?: mongoose.Types.ObjectId;

  subscriptionStatus: TeacherSubscriptionStatus;
  subscriptionAmount: number;
  subscriptionPaidUntil?: Date;

  payoutSchedule: "daily" | "weekly" | "monthly";
  minimumPayout: number;
  preferredPayoutMethod: "bank_transfer" | "stripe" | "paypal";
  bankDetails?: ITeacherBankDetails;

  acceptsPlatformPayments: boolean;
  autoPayoutEnabled: boolean;
}

/* ============================
   MAIN DOCUMENT
============================ */

export interface ITeacher extends Document {
  userId: mongoose.Types.ObjectId;

  fullName: string;
  bio?: string;
  subjects?: string[];
  specialization?: string;
  languagesSpoken?: UAE_LANGUAGE[];
  yearsOfExperience?: number;

  profileImageAssetId?: mongoose.Types.ObjectId;
  demoVideoAssetId?: mongoose.Types.ObjectId;

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

  stats?: {
    totalClasses: number;
    totalStudents: number;
    totalEarnings: number;
    averageRating: number;
    totalReviews: number;
    viewsCount: number;
  };

  isDeleted: boolean;
  deletedAt?: Date;

  memberSince: Date;
  createdAt: Date;
  updatedAt: Date;

  /* METHODS */
  canSwitchToCustomStripe(): boolean;
  isSubscriptionActive(): boolean;
  getEffectiveCommissionRate(): number;
  needsSubscriptionPayment(): boolean;
}

/* ============================
   SCHEMA
============================ */

const TeacherSchema = new Schema<ITeacher>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    fullName: { type: String, required: true },
    bio: String,
    subjects: [String],
    specialization: String,
    languagesSpoken: [
      {
        type: String,
        enum: Object.values(UAE_LANGUAGE),
      },
    ],

    yearsOfExperience: Number,

    profileImageAssetId: { type: Schema.Types.ObjectId, ref: "MediaAsset" },
    demoVideoAssetId: { type: Schema.Types.ObjectId, ref: "MediaAsset" },

    teachingMode: {
      type: String,
      enum: Object.values(TeachingMode),
      default: TeachingMode.ONLINE,
      index: true,
    },

    email: { type: String, required: true },
    phone: { type: String, required: true },

    address: {
      address: String,
      city: String,
      country: { type: String, default: "United Arab Emirates" },
      postalCode: String,
    },

    socialLinks: {
      facebook: String,
      linkedin: String,
      instagram: String,
      youtube: String,
      website: String,
      portfolio: String,
    },

    education: [
      {
        degree: String,
        institution: String,
        year: Number,
        country: String,
        certificateAssetId: { type: Schema.Types.ObjectId, ref: "MediaAsset" },
      },
    ],

    availabilityHours: { type: Object, default: {} },

    paymentSettings: {
      paymentMode: {
        type: String,
        enum: Object.values(TeacherPaymentMode),
        default: TeacherPaymentMode.PLATFORM_STRIPE,
      },
      paymentModeChangedAt: Date,
      paymentModeChangedBy: { type: Schema.Types.ObjectId, ref: "User" },

      stripeSettings: {
        stripeConnectAccountId: String,
        stripeConnectOnboardingComplete: { type: Boolean, default: false },
        stripePublishableKey: String,
        stripeSecretKey: { type: String, select: false },
        stripeTestMode: { type: Boolean, default: true },
      },

      commissionRate: { type: Number, default: 5 },
      commissionConfigId: {
        type: Schema.Types.ObjectId,
        ref: "CommissionConfig",
      },

      subscriptionStatus: {
        type: String,
        enum: Object.values(TeacherSubscriptionStatus),
        default: TeacherSubscriptionStatus.INACTIVE,
      },

      subscriptionAmount: { type: Number, default: 150 },
      subscriptionPaidUntil: Date,

      payoutSchedule: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
        default: "weekly",
      },
      minimumPayout: { type: Number, default: 50 },
      preferredPayoutMethod: {
        type: String,
        enum: ["bank_transfer", "stripe", "paypal"],
        default: "bank_transfer",
      },

      acceptsPlatformPayments: { type: Boolean, default: true },
      autoPayoutEnabled: { type: Boolean, default: false },
    },

    verificationStatus: {
      type: String,
      enum: Object.values(TeacherVerificationStatus),
      default: TeacherVerificationStatus.UNVERIFIED,
    },

    isActive: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },

    stats: {
      totalClasses: { type: Number, default: 0 },
      totalStudents: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      viewsCount: { type: Number, default: 0 },
    },

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,

    memberSince: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* ============================
   VIRTUALS
============================ */

TeacherSchema.virtual("subscription", {
  ref: "TeacherSubscription",
  localField: "_id",
  foreignField: "teacherId",
  justOne: true,
});

TeacherSchema.virtual("commissionTransactions", {
  ref: "CommissionTransaction",
  localField: "_id",
  foreignField: "commissions.recipientId",
});

TeacherSchema.virtual("mediaAssets", {
  ref: "MediaAsset",
  localField: "_id",
  foreignField: "usedBy.documentId",
});

/* ============================
   METHODS
============================ */

TeacherSchema.methods.canSwitchToCustomStripe = function () {
  return (
    this.paymentSettings.paymentMode === TeacherPaymentMode.PLATFORM_STRIPE &&
    this.verificationStatus === TeacherVerificationStatus.VERIFIED &&
    !this.isSuspended
  );
};

TeacherSchema.methods.isSubscriptionActive = function () {
  return (
    !!this.paymentSettings.subscriptionPaidUntil &&
    new Date(this.paymentSettings.subscriptionPaidUntil) > new Date()
  );
};

TeacherSchema.methods.getEffectiveCommissionRate = function () {
  if (
    this.paymentSettings.paymentMode === TeacherPaymentMode.CUSTOM_STRIPE &&
    this.isSubscriptionActive()
  ) {
    return 0;
  }
  return this.paymentSettings.commissionRate;
};

TeacherSchema.methods.needsSubscriptionPayment = function () {
  return (
    !this.paymentSettings.subscriptionPaidUntil ||
    new Date(this.paymentSettings.subscriptionPaidUntil) <= new Date()
  );
};

export default model<ITeacher>("Teacher", TeacherSchema);
