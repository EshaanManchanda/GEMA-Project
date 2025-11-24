import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPaymentSettings extends Document {
  stripeEnabled: boolean;
  stripePublicKey: string;
  stripeSecretKey: string;
  paypalEnabled: boolean;
  paypalClientId: string;
  paypalSecret: string;
  bankTransferEnabled: boolean;
  bankDetails: string;
  cashOnDeliveryEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentSettingsModel extends Model<IPaymentSettings> {
  getSettings(): Promise<IPaymentSettings>;
}

const PaymentSettingsSchema = new Schema<IPaymentSettings>(
  {
    stripeEnabled: {
      type: Boolean,
      default: true
    },
    stripePublicKey: {
      type: String,
      default: ''
    },
    stripeSecretKey: {
      type: String,
      default: ''
    },
    paypalEnabled: {
      type: Boolean,
      default: false
    },
    paypalClientId: {
      type: String,
      default: ''
    },
    paypalSecret: {
      type: String,
      default: ''
    },
    bankTransferEnabled: {
      type: Boolean,
      default: false
    },
    bankDetails: {
      type: String,
      default: ''
    },
    cashOnDeliveryEnabled: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'payment_settings'
  }
);

// Static method to get or create settings (singleton pattern)
PaymentSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const PaymentSettings = mongoose.model<IPaymentSettings, IPaymentSettingsModel>('PaymentSettings', PaymentSettingsSchema);

export default PaymentSettings;
