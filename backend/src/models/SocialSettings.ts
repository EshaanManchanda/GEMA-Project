import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISocialSettings extends Document {
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  linkedinUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISocialSettingsModel extends Model<ISocialSettings> {
  getSettings(): Promise<ISocialSettings>;
}

const SocialSettingsSchema = new Schema<ISocialSettings>(
  {
    facebookUrl: {
      type: String,
      default: ''
    },
    twitterUrl: {
      type: String,
      default: ''
    },
    instagramUrl: {
      type: String,
      default: ''
    },
    youtubeUrl: {
      type: String,
      default: ''
    },
    linkedinUrl: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true,
    collection: 'social_settings'
  }
);

// Static method to get or create settings (singleton pattern)
SocialSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const SocialSettings = mongoose.model<ISocialSettings, ISocialSettingsModel>('SocialSettings', SocialSettingsSchema);

export default SocialSettings;
