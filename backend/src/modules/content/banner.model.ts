import mongoose, { Schema, Document } from "mongoose";

export interface IBanner extends Document {
  title: string;
  description?: string;
  imageAsset: mongoose.Types.ObjectId;
  link?: string;
  ctaText?: string;
  ctaLink?: string;
  displayOrder: number;
  status: "active" | "inactive" | "scheduled";
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  titleVisible: boolean;
  descriptionVisible: boolean;
  ctaVisible: boolean;
  objectFit: "cover" | "contain" | "fill";
  objectPosition:
    | "center"
    | "top"
    | "bottom"
    | "left center"
    | "right center"
    | "top left"
    | "top right"
    | "bottom left"
    | "bottom right";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    title: {
      type: String,
      required: true,
      maxlength: 200,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    imageAsset: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
    },
    link: {
      type: String,
      trim: true,
      validate: {
        validator: (v: string) => !v || /^https?:\/\//.test(v) || /^\//.test(v),
        message: "Link must be a valid URL or relative path",
      },
    },
    ctaText: {
      type: String,
      maxlength: 50,
      trim: true,
    },
    ctaLink: {
      type: String,
      trim: true,
    },
    objectFit: {
      type: String,
      enum: ["cover", "contain", "fill"],
      default: "cover",
    },
    objectPosition: {
      type: String,
      enum: [
        "center",
        "top",
        "bottom",
        "left center",
        "right center",
        "top left",
        "top right",
        "bottom left",
        "bottom right",
      ],
      default: "center",
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
    titleVisible: {
      type: Boolean,
      default: false,
    },
    descriptionVisible: {
      type: Boolean,
      default: false,
    },
    ctaVisible: {
      type: Boolean,
      default: false,
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
BannerSchema.index({ status: 1, displayOrder: 1, startDate: 1, endDate: 1 });

// Virtual to check if banner should be displayed
BannerSchema.virtual("shouldDisplay").get(function () {
  if (!this.isActive || this.status === "inactive") return false;

  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;

  return true;
});

export default mongoose.model<IBanner>("Banner", BannerSchema);
