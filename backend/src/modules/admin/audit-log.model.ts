import mongoose, { Schema, model, Document } from "mongoose";

export enum AuditAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  SUSPEND = "suspend",
  REINSTATE = "reinstate",
  IMPERSONATE = "impersonate",
  FORCE_LOGOUT = "force_logout",
  BULK_SUSPEND = "bulk_suspend",
  API_KEY_CREATE = "api_key_create",
  API_KEY_REVOKE = "api_key_revoke",
  SETTINGS_UPDATE = "settings_update",
  FEATURE_FLAG_UPDATE = "feature_flag_update",
  MIGRATION_RUN = "migration_run",
  LOGIN = "login",
  LOGOUT = "logout",
}

export interface IAuditLog extends Document {
  actorId: mongoose.Types.ObjectId;
  actorRole: string;
  action: AuditAction;
  resource: string;
  resourceType?: string;
  resourceId?: mongoose.Types.ObjectId;
  method: string;
  requestBody?: Record<string, any>;
  responseBody?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    actorRole: { type: String, required: true },
    action: { type: String, enum: Object.values(AuditAction), required: true, index: true },
    resource: { type: String, required: true },
    resourceType: String,
    resourceId: { type: Schema.Types.ObjectId },
    method: { type: String, required: true },
    requestBody: Schema.Types.Mixed,
    responseBody: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

AuditLogSchema.index({ actorId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, timestamp: -1 });

const AuditLog = model<IAuditLog>("AuditLog", AuditLogSchema);
export default AuditLog;
