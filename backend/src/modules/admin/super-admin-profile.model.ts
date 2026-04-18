import mongoose, { Schema, model, Document } from "mongoose";

export interface ISuperAdminProfile extends Document {
  userId: mongoose.Types.ObjectId;
  twoFactorEnabled: boolean;
  backupCodes: string[];
  lastPasswordChange: Date;
  sessionLimit: number;
  lastLoginAt: Date;
  lastLoginIP: string;
  loginHistory: Array<{
    ip: string;
    userAgent: string;
    timestamp: Date;
    location?: string;
  }>;
  dashboardLayout: Record<string, any>;
  notificationPreferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
    securityAlerts: boolean;
    systemAlerts: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SuperAdminProfileSchema = new Schema<ISuperAdminProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    twoFactorEnabled: { type: Boolean, default: false },
    backupCodes: [{ type: String }],
    lastPasswordChange: { type: Date, default: Date.now },
    sessionLimit: { type: Number, default: 3 },
    lastLoginAt: Date,
    lastLoginIP: String,
    loginHistory: [
      {
        ip: String,
        userAgent: String,
        timestamp: { type: Date, default: Date.now },
        location: String,
      },
    ],
    dashboardLayout: { type: Schema.Types.Mixed, default: {} },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      systemAlerts: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

SuperAdminProfileSchema.index({ userId: 1 });

const SuperAdminProfile = model<ISuperAdminProfile>("SuperAdminProfile", SuperAdminProfileSchema);
export default SuperAdminProfile;
