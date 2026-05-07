import mongoose, { Schema, Document } from "mongoose";

export interface IPopupNotification extends Document {
  // Content
  title: string;
  message: string;
  image?: mongoose.Types.ObjectId; // Reference to MediaAsset
  ctaText?: string;
  ctaLink?: string;
  dismissText?: string;

  // Targeting
  targetAudience: "all" | "authenticated" | "anonymous";
  targetRoles?: ("admin" | "vendor" | "customer" | "employee")[];
  targetPages: "all" | "specific";
  specificPages?: string[];
  excludePages?: string[];

  // Triggers
  trigger: "pageLoad" | "timeDelay" | "scrollPercent" | "exitIntent";
  triggerValue?: number; // seconds for timeDelay, percentage for scrollPercent

  // Frequency Control
  frequency: "once" | "session" | "daily" | "always";

  // Display Settings
  displayOrder: number;
  status: "active" | "inactive" | "scheduled";
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;

  // Styling
  backgroundColor?: string;
  textColor?: string;
  overlayOpacity?: number; // 0-100
  position?: "center" | "top" | "bottom";
  size?: "small" | "medium" | "large";

  // Analytics
  impressions: number;
  clicks: number;
  dismissals: number;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PopupNotificationSchema = new Schema<IPopupNotification>(
  {
    // Content
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    image: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: false,
    },
    ctaText: {
      type: String,
      trim: true,
      maxlength: 30,
    },
    ctaLink: {
      type: String,
      trim: true,
    },
    dismissText: {
      type: String,
      trim: true,
      maxlength: 30,
      default: "Close",
    },

    // Targeting
    targetAudience: {
      type: String,
      enum: ["all", "authenticated", "anonymous"],
      required: true,
      default: "all",
    },
    targetRoles: {
      type: [String],
      enum: ["admin", "vendor", "customer", "employee"],
      default: [],
    },
    targetPages: {
      type: String,
      enum: ["all", "specific"],
      required: true,
      default: "all",
    },
    specificPages: {
      type: [String],
      default: [],
    },
    excludePages: {
      type: [String],
      default: [],
    },

    // Triggers
    trigger: {
      type: String,
      enum: ["pageLoad", "timeDelay", "scrollPercent", "exitIntent"],
      required: true,
      default: "timeDelay",
    },
    triggerValue: {
      type: Number,
      min: 0,
    },

    // Frequency Control
    frequency: {
      type: String,
      enum: ["once", "session", "daily", "always"],
      required: true,
      default: "once",
    },

    // Display Settings
    displayOrder: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "scheduled"],
      required: true,
      default: "inactive",
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },

    // Styling
    backgroundColor: {
      type: String,
      default: "#FFFFFF",
    },
    textColor: {
      type: String,
      default: "#000000",
    },
    overlayOpacity: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    position: {
      type: String,
      enum: ["center", "top", "bottom"],
      default: "center",
    },
    size: {
      type: String,
      enum: ["small", "medium", "large"],
      default: "medium",
    },

    // Analytics
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    dismissals: {
      type: Number,
      default: 0,
    },

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
PopupNotificationSchema.index({ status: 1, isActive: 1, displayOrder: 1 });
PopupNotificationSchema.index({ startDate: 1, endDate: 1 });
PopupNotificationSchema.index({ targetAudience: 1, targetRoles: 1 });
PopupNotificationSchema.index({ createdBy: 1 });

// Virtual for checking if popup should display based on dates
PopupNotificationSchema.virtual("shouldDisplay").get(function () {
  const now = new Date();

  // Check if inactive
  if (!this.isActive || this.status === "inactive") {
    return false;
  }

  // Check start date
  if (this.startDate && new Date(this.startDate) > now) {
    return false;
  }

  // Check end date
  if (this.endDate && new Date(this.endDate) < now) {
    return false;
  }

  return true;
});

const PopupNotification = mongoose.model<IPopupNotification>(
  "PopupNotification",
  PopupNotificationSchema,
);

export default PopupNotification;
