import mongoose, { Schema, Document } from "mongoose";

export interface IAnnouncementBar extends Document {
  message: string;
  shortDescription?: string;
  link?: string;
  linkText?: string;
  icon?: string;
  backgroundColor: string;
  textColor: string;
  variant: "info" | "warning" | "success" | "error";
  displayOrder: number;
  status: "active" | "inactive" | "scheduled";
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  targetPages: "all" | "specific";
  specificPages?: string[];
  excludePages?: string[];
  isDismissible: boolean;
  dismissalDuration?: number;
  impressions: number;
  clicks: number;
  dismissals: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementBarSchema = new Schema<IAnnouncementBar>(
  {
    message: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },
    shortDescription: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    link: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string) => !v || /^https?:\/\//.test(v) || /^\//.test(v),
        message: "Link must be a valid URL or relative path",
      },
    },
    linkText: {
      type: String,
      maxlength: 30,
      trim: true,
    },
    icon: {
      type: String,
      maxlength: 50,
      trim: true,
    },
    backgroundColor: {
      type: String,
      required: true,
      default: "#3B82F6", // Blue
    },
    textColor: {
      type: String,
      required: true,
      default: "#FFFFFF", // White
      validate: {
        validator: (v: string) => /^#[0-9A-F]{6}$/i.test(v),
        message: "Text color must be a valid hex color",
      },
    },
    variant: {
      type: String,
      enum: ["info", "warning", "success", "error"],
      default: "info",
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "scheduled"],
      default: "inactive",
    },
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    targetPages: {
      type: String,
      enum: ["all", "specific"],
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
    isDismissible: {
      type: Boolean,
      default: true,
    },
    dismissalDuration: {
      type: Number,
      min: 0,
      default: null,
    },
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

// Index for efficient querying
AnnouncementBarSchema.index({
  status: 1,
  displayOrder: 1,
  startDate: 1,
  endDate: 1,
});
AnnouncementBarSchema.index({ targetPages: 1, isActive: 1 });

// Virtual to check if announcement should be displayed
AnnouncementBarSchema.virtual("shouldDisplay").get(function () {
  if (!this.isActive || this.status === "inactive") return false;

  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;

  return true;
});

export default mongoose.model<IAnnouncementBar>(
  "AnnouncementBar",
  AnnouncementBarSchema,
);
