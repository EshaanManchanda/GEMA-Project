import mongoose, { Schema, model, Document } from "mongoose";

export enum AdminRoleType {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MODERATOR = "moderator",
  BLOG_WRITER = "blog_writer",
  SUPPORT_AGENT = "support_agent",
  CONTENT_MANAGER = "content_manager",
  FINANCE_MANAGER = "finance_manager",
}

export interface IAdminRole extends Document {
  userId: mongoose.Types.ObjectId;
  role: AdminRoleType;
  assignedBy: mongoose.Types.ObjectId;
  assignedAt: Date;
  customPermissions?: string[];
  revokedPermissions?: string[];
  scope: {
    eventCategories?: string[];
    blogCategories?: string[];
    ticketCategories?: string[];
    regions?: string[];
  };
  isActive: boolean;
  expiresAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminRoleSchema = new Schema<IAdminRole>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: Object.values(AdminRoleType), required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedAt: { type: Date, default: Date.now },
    customPermissions: [String],
    revokedPermissions: [String],
    scope: {
      eventCategories: [String],
      blogCategories: [String],
      ticketCategories: [String],
      regions: [String],
    },
    isActive: { type: Boolean, default: true },
    expiresAt: Date,
    notes: String,
  },
  { timestamps: true },
);

AdminRoleSchema.index({ userId: 1, role: 1 });
AdminRoleSchema.index({ isActive: 1, expiresAt: 1 });

const AdminRole = model<IAdminRole>("AdminRole", AdminRoleSchema);
export default AdminRole;
