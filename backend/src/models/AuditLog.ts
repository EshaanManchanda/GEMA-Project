import mongoose, { Schema, Document, Types } from "mongoose";

export enum AuditAction {
  LOGIN = "login",
  LOGIN_FAILED = "login_failed",
  LOGOUT = "logout",
  REGISTER = "register",
  PASSWORD_CHANGE = "password_change",
  PASSWORD_RESET = "password_reset",
  ROLE_CHANGE = "role_change",
  EVENT_APPROVAL = "event_approval",
  BOOKING_CONFIRMED = "booking_confirmed",
  PAYOUT = "payout",
  ACCOUNT_LOCKED = "account_locked",
  SESSION_REVOKED = "session_revoked",
}

export interface IAuditLog extends Document {
  action: AuditAction;
  userId?: Types.ObjectId;
  targetId?: Types.ObjectId;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, enum: Object.values(AuditAction) },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    targetId: { type: Schema.Types.ObjectId },
    ip: String,
    userAgent: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 }); // 90-day TTL

const AuditLog = mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
export default AuditLog;
