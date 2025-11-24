import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IEmailSettings extends Document {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpEncryption: string;
  senderName: string;
  senderEmail: string;
  welcomeEmailTemplate: string;
  bookingConfirmationTemplate: string;
  passwordResetTemplate: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailSettingsModel extends Model<IEmailSettings> {
  getSettings(): Promise<IEmailSettings>;
}

const EmailSettingsSchema = new Schema<IEmailSettings>(
  {
    smtpHost: {
      type: String,
      default: 'smtp.example.com'
    },
    smtpPort: {
      type: Number,
      default: 587
    },
    smtpUser: {
      type: String,
      default: 'notifications@gemaevents.com'
    },
    smtpPassword: {
      type: String,
      default: ''
    },
    smtpEncryption: {
      type: String,
      default: 'tls',
      enum: ['none', 'ssl', 'tls']
    },
    senderName: {
      type: String,
      default: 'Gema Events'
    },
    senderEmail: {
      type: String,
      default: 'no-reply@gemaevents.com'
    },
    welcomeEmailTemplate: {
      type: String,
      default: '<h1>Welcome to Gema Events!</h1><p>Thank you for joining our platform.</p>'
    },
    bookingConfirmationTemplate: {
      type: String,
      default: '<h1>Booking Confirmed!</h1><p>Your booking has been confirmed.</p>'
    },
    passwordResetTemplate: {
      type: String,
      default: '<h1>Password Reset</h1><p>Click the link below to reset your password.</p>'
    }
  },
  {
    timestamps: true,
    collection: 'email_settings'
  }
);

// Static method to get or create settings (singleton pattern)
EmailSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const EmailSettings = mongoose.model<IEmailSettings, IEmailSettingsModel>('EmailSettings', EmailSettingsSchema);

export default EmailSettings;
