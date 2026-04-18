import mongoose, { Document, Schema, model, Model } from "mongoose";

export enum PayoutFrequency {
  WEEKLY = "weekly",
  BIWEEKLY = "biweekly",
  MONTHLY = "monthly",
  MANUAL = "manual",
}

export enum CommissionStructure {
  FLAT_FEE = "flat_fee",
  FLAT_RATE = "flat_rate",
  PERCENTAGE = "percentage",
  TIERED = "tiered",
  HYBRID = "hybrid",
}

export enum TaxCalculationMethod {
  INCLUSIVE = "inclusive",
  EXCLUSIVE = "exclusive",
  NONE = "none",
}

export interface IPaymentGateway {
  stripe?: {
    secretKey?: string;
    publishableKey?: string;
    webhookSecret?: string;
    connectClientId?: string;
    enabled?: boolean;
  };
  razorpay?: {
    keyId?: string;
    keySecret?: string;
    enabled?: boolean;
  };
  paypal?: {
    clientId?: string;
    clientSecret?: string;
    mode?: "sandbox" | "live";
    enabled?: boolean;
  };
}

export interface IAdminRevenueSettings extends Document {
  minimumPayout: number;
  minimumPayoutAmount?: number;
  payoutFrequency: PayoutFrequency;
  commissionStructure: CommissionStructure;
  defaultPlatformFeePercentage: number;
  defaultVendorCommissionPercentage: number;
  defaultTeacherCommissionPercentage: number;
  defaultCommissionRate?: number;
  taxCalculationMethod: TaxCalculationMethod;
  taxPercentage: number;
  taxSettings?: Record<string, any>;
  currency: string;
  paymentGateways: IPaymentGateway;
  autoProcessPayouts: boolean;
  payoutProcessingDay?: number;
  holdPeriodDays: number;
  referralCommissionPercentage: number;
  affiliateCommissionPercentage: number;
  couponDiscountPercentage: number;
  version?: number;
  maintenanceMode?: boolean;
  isActive?: boolean;
  lastModifiedBy?: mongoose.Types.ObjectId;
  lastModifiedAt?: Date;
  platformName?: string;
  payoutCurrency?: string;
  getMinimumPayoutForVendor?(vendorId: mongoose.Types.ObjectId | string): Promise<number>;
  createdAt: Date;
  updatedAt: Date;
}

const AdminRevenueSettingsSchema = new Schema<IAdminRevenueSettings>(
  {
    minimumPayout: { type: Number, default: 50 },
    payoutFrequency: {
      type: String,
      enum: Object.values(PayoutFrequency),
      default: PayoutFrequency.WEEKLY,
    },
    commissionStructure: {
      type: String,
      enum: Object.values(CommissionStructure),
      default: CommissionStructure.PERCENTAGE,
    },
    defaultPlatformFeePercentage: { type: Number, default: 5 },
    defaultVendorCommissionPercentage: { type: Number, default: 90 },
    defaultTeacherCommissionPercentage: { type: Number, default: 85 },
    defaultCommissionRate: { type: Number, default: 10 },
    taxCalculationMethod: {
      type: String,
      enum: Object.values(TaxCalculationMethod),
      default: TaxCalculationMethod.EXCLUSIVE,
    },
    taxPercentage: { type: Number, default: 5 },
    taxSettings: { type: Schema.Types.Mixed },
    currency: { type: String, default: "AED" },
    paymentGateways: {
      stripe: {
        secretKey: String,
        publishableKey: String,
        webhookSecret: String,
        connectClientId: String,
      },
      razorpay: {
        keyId: String,
        keySecret: String,
      },
      paypal: {
        clientId: String,
        clientSecret: String,
        mode: { type: String, enum: ["sandbox", "live"], default: "sandbox" },
      },
    },
    autoProcessPayouts: { type: Boolean, default: false },
    payoutProcessingDay: { type: Number, min: 1, max: 7 },
    holdPeriodDays: { type: Number, default: 7 },
    referralCommissionPercentage: { type: Number, default: 10 },
    affiliateCommissionPercentage: { type: Number, default: 5 },
    couponDiscountPercentage: { type: Number, default: 10 },
  },
  { timestamps: true }
);

export interface IAdminRevenueSettingsModel extends Model<IAdminRevenueSettings> {
  getCurrentSettings(): Promise<IAdminRevenueSettings>;
}

AdminRevenueSettingsSchema.statics.getCurrentSettings = async function () {
  const settings = await this.findOne().sort({ createdAt: -1 });
  if (!settings) {
    return await this.create({});
  }
  return settings;
};

export const AdminRevenueSettings = model<IAdminRevenueSettings, IAdminRevenueSettingsModel>(
  "AdminRevenueSettings",
  AdminRevenueSettingsSchema
);

export default AdminRevenueSettings;
