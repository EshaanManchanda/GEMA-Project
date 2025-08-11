import mongoose, { Document, Schema } from 'mongoose';

// Permission interface
export interface IPermission {
  name: string;
  description: string;
}

// Role Document Interface
export interface IRole extends Document {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Role Schema
const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      trim: true,
      lowercase: true
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    permissions: [
      {
        type: String,
        trim: true
      }
    ]
  },
  {
    timestamps: true
  }
);

// Indexes
RoleSchema.index({ name: 1 });

// Create and export the Role model
const Role = mongoose.model<IRole>('Role', RoleSchema);
export default Role;

// Define available permissions
export const PERMISSIONS = {
  // User permissions
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_MANAGE: 'users.manage',
  
  // Event permissions
  EVENTS_READ: 'events.read',
  EVENTS_CREATE: 'events.create',
  EVENTS_UPDATE: 'events.update',
  EVENTS_DELETE: 'events.delete',
  EVENTS_MANAGE: 'events.manage',
  EVENTS_MANAGE_OWN: 'events.manage_own',
  
  // Order permissions
  ORDERS_READ: 'orders.read',
  ORDERS_CREATE: 'orders.create',
  ORDERS_UPDATE: 'orders.update',
  ORDERS_DELETE: 'orders.delete',
  ORDERS_MANAGE: 'orders.manage',
  ORDERS_MANAGE_OWN: 'orders.manage_own',
  
  // Review permissions
  REVIEWS_READ: 'reviews.read',
  REVIEWS_CREATE: 'reviews.create',
  REVIEWS_UPDATE: 'reviews.update',
  REVIEWS_DELETE: 'reviews.delete',
  REVIEWS_MANAGE: 'reviews.manage',
  REVIEWS_MANAGE_OWN: 'reviews.manage_own',
  
  // Settings permissions
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  
  // Dashboard permissions
  DASHBOARD_ACCESS: 'dashboard.access',
  DASHBOARD_ANALYTICS: 'dashboard.analytics',
  
  // Vendor permissions
  VENDOR_PROFILE_MANAGE: 'vendor.profile_manage',
  VENDOR_EVENTS_MANAGE: 'vendor.events_manage',
  VENDOR_ORDERS_MANAGE: 'vendor.orders_manage',
  VENDOR_ANALYTICS_VIEW: 'vendor.analytics_view'
};

// Define default roles with their permissions
export const DEFAULT_ROLES = {
  ADMIN: {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full access to all system features',
    permissions: Object.values(PERMISSIONS)
  },
  CUSTOMER: {
    name: 'customer',
    displayName: 'Customer',
    description: 'Regular user who can book events',
    permissions: [
      PERMISSIONS.EVENTS_READ,
      PERMISSIONS.ORDERS_CREATE,
      PERMISSIONS.ORDERS_MANAGE_OWN,
      PERMISSIONS.REVIEWS_CREATE,
      PERMISSIONS.REVIEWS_MANAGE_OWN
    ]
  },
  VENDOR: {
    name: 'vendor',
    displayName: 'Vendor',
    description: 'Event provider who can create and manage events',
    permissions: [
      PERMISSIONS.EVENTS_READ,
      PERMISSIONS.EVENTS_CREATE,
      PERMISSIONS.EVENTS_MANAGE_OWN,
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.ORDERS_MANAGE_OWN,
      PERMISSIONS.REVIEWS_READ,
      PERMISSIONS.VENDOR_PROFILE_MANAGE,
      PERMISSIONS.VENDOR_EVENTS_MANAGE,
      PERMISSIONS.VENDOR_ORDERS_MANAGE,
      PERMISSIONS.VENDOR_ANALYTICS_VIEW
    ]
  }
};