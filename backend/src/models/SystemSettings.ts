import mongoose, { Document, Schema, Model } from 'mongoose';

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
  smsNotifications: boolean;
  pushNotifications: boolean;
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
      default: 'Gema Events'
    },
    siteDescription: {
      type: String,
      default: 'Find and book the best events for kids'
    },
    contactEmail: {
      type: String,
      default: 'contact@gemaevents.com'
    },
    supportPhone: {
      type: String,
      default: '+1 (555) 123-4567'
    },
    maintenanceMode: {
      type: Boolean,
      default: false
    },
    allowRegistration: {
      type: Boolean,
      default: true
    },
    defaultLanguage: {
      type: String,
      default: 'en',
      enum: ['en', 'es', 'fr', 'de', 'ar']
    },
    timeZone: {
      type: String,
      default: 'UTC'
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'AED', 'JPY']
    },
    bookingFeePercentage: {
      type: Number,
      default: 5,
      min: 0,
      max: 100
    },
    taxPercentage: {
      type: Number,
      default: 7.5,
      min: 0,
      max: 100
    },
    featuredEventCost: {
      type: Number,
      default: 49.99,
      min: 0
    },
    maxImagesPerEvent: {
      type: Number,
      default: 10,
      min: 1
    },
    maxEventsPerVendor: {
      type: Number,
      default: 50,
      min: 1
    },
    autoApproveEvents: {
      type: Boolean,
      default: false
    },
    autoApproveVendors: {
      type: Boolean,
      default: false
    },
    autoApproveReviews: {
      type: Boolean,
      default: false
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'system_settings'
  }
);

// Static method to get or create settings (singleton pattern)
SystemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const SystemSettings = mongoose.model<ISystemSettings, ISystemSettingsModel>('SystemSettings', SystemSettingsSchema);

export default SystemSettings;
