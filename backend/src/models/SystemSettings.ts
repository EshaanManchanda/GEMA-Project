import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISystemSettings extends Document {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  supportPhone: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  defaultLanguage: string;
  timeZone: string;
  currency: string;
  bookingFeePercentage: number;
  taxPercentage: number;
  featuredEventCost: number;
  maxImagesPerEvent: number;
  maxEventsPerVendor: number;
  autoApproveEvents: boolean;
  autoApproveVendors: boolean;
  autoApproveReviews: boolean;
  emailNotifications: boolean;
  /** @deprecated use `whatsappNotifications` — kept for migration fallback only */
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  pushNotifications: boolean;
  animationsEnabled: boolean;
  /** Kill switch for the Business Optimization / Report Center (KBOS). Admin access is never gated by this — only the vendor-facing surface is. */
  businessReportsEnabled: boolean;
  /** Name/email of the admin who last saved these settings — for the admin UI's "Last updated by" line. */
  lastModifiedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISystemSettingsModel extends Model<ISystemSettings> {
  getSettings(): Promise<ISystemSettings>;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    siteName: {
      type: String,
      default: process.env.SITE_NAME || "Kidrove",
    },
    siteDescription: {
      type: String,
      default:
        process.env.SITE_DESCRIPTION ||
        "Discover and book amazing family events and kids activities across the UAE",
    },
    contactEmail: {
      type: String,
      default:
        process.env.CONTACT_EMAIL ||
        process.env.EMAIL_FROM ||
        "contact@kidrove.com",
    },
    supportPhone: {
      type: String,
      default: "+1 (555) 123-4567",
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    allowRegistration: {
      type: Boolean,
      default: true,
    },
    defaultLanguage: {
      type: String,
      default: "en",
      enum: ["en", "es", "fr", "de", "ar"],
    },
    timeZone: {
      type: String,
      default: "Asia/Dubai",
    },
    currency: {
      type: String,
      default: "AED",
      enum: ["USD", "EUR", "GBP", "AED", "JPY"],
    },
    bookingFeePercentage: {
      type: Number,
      default: 5,
      min: 0,
      max: 100,
    },
    taxPercentage: {
      type: Number,
      default: 7.5,
      min: 0,
      max: 100,
    },
    featuredEventCost: {
      type: Number,
      default: 49.99,
      min: 0,
    },
    maxImagesPerEvent: {
      type: Number,
      default: 10,
      min: 1,
    },
    maxEventsPerVendor: {
      type: Number,
      default: 50,
      min: 1,
    },
    autoApproveEvents: {
      type: Boolean,
      default: false,
    },
    autoApproveVendors: {
      type: Boolean,
      default: false,
    },
    autoApproveReviews: {
      type: Boolean,
      default: false,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: false,
    },
    whatsappNotifications: {
      type: Boolean,
      default: false,
    },
    pushNotifications: {
      type: Boolean,
      default: true,
    },
    animationsEnabled: {
      type: Boolean,
      default: true,
    },
    businessReportsEnabled: {
      type: Boolean,
      default: true,
    },
    lastModifiedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "system_settings",
  },
);

// Static method to get or create settings (singleton pattern)
SystemSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const SystemSettings = mongoose.model<ISystemSettings, ISystemSettingsModel>(
  "SystemSettings",
  SystemSettingsSchema,
);

export default SystemSettings;
