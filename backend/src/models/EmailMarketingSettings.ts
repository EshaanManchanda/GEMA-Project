import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * Admin-managed email-marketing provider config (singleton). Secret fields are
 * stored encrypted (utils/encryption.ts) and never sent back to the client.
 * An empty field means "fall back to the env var" — see
 * services/communication/emailMarketingConfig.service.ts.
 */
export interface IEmailMarketingSettings extends Document {
  provider: "" | "dev" | "sender" | "mailchimp";
  senderApiKey: string; // encrypted
  senderListId: string;
  senderWebhookSecret: string; // encrypted
  mailchimpApiKey: string; // encrypted
  mailchimpServerPrefix: string;
  mailchimpAudienceId: string;
  mailchimpWebhookSecret: string; // encrypted
  updatedAt: Date;
}

export interface IEmailMarketingSettingsModel
  extends Model<IEmailMarketingSettings> {
  getSettings(): Promise<IEmailMarketingSettings>;
}

const str = { type: String, default: "" };

const EmailMarketingSettingsSchema = new Schema<IEmailMarketingSettings>(
  {
    provider: {
      type: String,
      enum: ["", "dev", "sender", "mailchimp"],
      default: "",
    },
    senderApiKey: str,
    senderListId: str,
    senderWebhookSecret: str,
    mailchimpApiKey: str,
    mailchimpServerPrefix: str,
    mailchimpAudienceId: str,
    mailchimpWebhookSecret: str,
  },
  { timestamps: true, collection: "email_marketing_settings" },
);

EmailMarketingSettingsSchema.statics.getSettings = async function () {
  return (await this.findOne()) ?? (await this.create({}));
};

const EmailMarketingSettings = mongoose.model<
  IEmailMarketingSettings,
  IEmailMarketingSettingsModel
>("EmailMarketingSettings", EmailMarketingSettingsSchema);

export default EmailMarketingSettings;
