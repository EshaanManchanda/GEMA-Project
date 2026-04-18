import mongoose, { Document, Schema } from "mongoose";

export interface IMediaAsset extends Document {
  // Core identification
  uuid: string; // UUID for secure public access
  filename: string;
  originalName: string;
  mimeType: string;
  fileExtension: string;

  // Storage information
  provider: "cloudinary" | "local";
  url: string;

  // Cloudinary-specific
  publicId?: string;
  cloudinaryFolder?: string;

  // Local-specific
  localPath?: string;

  // Metadata
  size: number;
  width?: number;
  height?: number;
  duration?: number;

  // Categorization (LOGICAL FOLDERS)
  category:
    | "blog"
    | "profile"
    | "event"
    | "document"
    | "venue"
    | "reel"
    | "misc";
  folder: string; // Virtual: "blogs.upload", "profile.upload", "event.uploads"
  tags: string[];

  // Usage tracking
  usedBy: Array<{
    model: "Blog" | "Event" | "User" | "Reel";
    field: string;
    documentId: mongoose.Types.ObjectId;
  }>;
  usageCount: number;

  // Access control
  uploadedBy: mongoose.Types.ObjectId;
  isPublic: boolean;

  // Optimization
  thumbnailUrl?: string;
  variations?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;

  // Virtual fields
  directUrl?: string; // Computed: Direct Cloudinary CDN URL or backend API URL

  // Methods
  incrementUsage(
    model: "Blog" | "Event" | "User",
    field: string,
    documentId: mongoose.Types.ObjectId,
  ): Promise<void>;
  decrementUsage(documentId: mongoose.Types.ObjectId): Promise<void>;
}

const mediaAssetSchema = new Schema<IMediaAsset>(
  {
    filename: {
      type: String,
      required: [true, "Filename is required"],
      trim: true,
    },
    originalName: {
      type: String,
      required: [true, "Original name is required"],
      trim: true,
    },
    mimeType: {
      type: String,
      required: [true, "MIME type is required"],
    },
    fileExtension: {
      type: String,
      required: [true, "File extension is required"],
    },
    uuid: {
      type: String,
      required: [true, "UUID is required"],
      unique: true,
    },
    provider: {
      type: String,
      enum: {
        values: ["cloudinary", "local"],
        message: "Provider must be either cloudinary or local",
      },
      required: [true, "Provider is required"],
    },
    url: {
      type: String,
      required: [true, "URL is required"],
    },
    publicId: {
      type: String,
    },
    cloudinaryFolder: {
      type: String,
    },
    localPath: {
      type: String,
    },
    size: {
      type: Number,
      required: [true, "File size is required"],
      min: [0, "File size cannot be negative"],
      max: [52428800, "File size cannot exceed 50MB"], // 50MB in bytes
    },
    width: {
      type: Number,
      min: [0, "Width cannot be negative"],
    },
    height: {
      type: Number,
      min: [0, "Height cannot be negative"],
    },
    duration: {
      type: Number,
      min: [0, "Duration cannot be negative"],
    },
    category: {
      type: String,
      enum: {
        values: [
          "blog",
          "profile",
          "event",
          "document",
          "venue",
          "reel",
          "misc",
        ],
        message:
          "Category must be one of: blog, profile, event, document, venue, reel, misc",
      },
      required: [true, "Category is required"],
      index: true,
    },
    folder: {
      type: String,
      required: [true, "Folder is required"],
      trim: true,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    usedBy: [
      {
        model: {
          type: String,
          enum: {
            values: ["Blog", "Event", "User", "Reel"],
            message: "Model must be one of: Blog, Event, User, Reel",
          },
        },
        field: {
          type: String,
          trim: true,
        },
        documentId: {
          type: Schema.Types.ObjectId,
        },
      },
    ],
    usageCount: {
      type: Number,
      default: 0,
      min: [0, "Usage count cannot be negative"],
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader is required"],
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    thumbnailUrl: {
      type: String,
    },
    variations: {
      thumbnail: { type: String },
      small: { type: String },
      medium: { type: String },
      large: { type: String },
    },
    lastAccessedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound indexes for fast queries
mediaAssetSchema.index({ category: 1, createdAt: -1 });
mediaAssetSchema.index({ folder: 1, createdAt: -1 });
mediaAssetSchema.index({ uploadedBy: 1, createdAt: -1 });
mediaAssetSchema.index({ mimeType: 1 });
mediaAssetSchema.index({ publicId: 1 }, { sparse: true });
mediaAssetSchema.index({ "usedBy.documentId": 1 });
mediaAssetSchema.index({ category: 1, folder: 1, createdAt: -1 });
// uuid index is automatically created by 'unique: true' in schema definition

// Text index for search functionality
mediaAssetSchema.index({
  filename: "text",
  originalName: "text",
  tags: "text",
});

// Virtual field for direct access URL (optimized for Cloudinary)
// Returns Cloudinary CDN URL directly for Cloudinary assets, bypassing backend proxy
mediaAssetSchema.virtual("directUrl").get(function (this: IMediaAsset) {
  // For Cloudinary assets, return direct CDN URL for better performance
  if (this.provider === "cloudinary" && this.publicId) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (cloudName) {
      // Use Cloudinary's CDN URL directly (no backend proxy needed)
      return `https://res.cloudinary.com/${cloudName}/image/upload/${this.publicId}`;
    }
  }

  // Fallback to backend API URL for local files or if Cloudinary config missing
  const baseUrl =
    process.env.BASE_URL || `http://localhost:${process.env.PORT || "5001"}`;
  return `${baseUrl}/api/media/file/${this.uuid}`;
});

// Static method to find unused media
mediaAssetSchema.statics.findUnused = function () {
  return this.find({ usageCount: 0 }).sort({ createdAt: -1 });
};

// Static method to find by category
mediaAssetSchema.statics.findByCategory = function (category: string) {
  return this.find({ category }).sort({ createdAt: -1 });
};

// Static method to find by folder
mediaAssetSchema.statics.findByFolder = function (folder: string) {
  return this.find({ folder }).sort({ createdAt: -1 });
};

// Instance method to increment usage
mediaAssetSchema.methods.incrementUsage = async function (
  model: "Blog" | "Event" | "User",
  field: string,
  documentId: mongoose.Types.ObjectId,
) {
  this.usedBy.push({ model, field, documentId });
  this.usageCount += 1;
  await this.save();
};

// Instance method to decrement usage
mediaAssetSchema.methods.decrementUsage = async function (
  documentId: mongoose.Types.ObjectId,
) {
  this.usedBy = this.usedBy.filter(
    (usage: any) => usage.documentId.toString() !== documentId.toString(),
  );
  this.usageCount = Math.max(0, this.usageCount - 1);
  await this.save();
};

const MediaAsset = mongoose.model<IMediaAsset>("MediaAsset", mediaAssetSchema);

export default MediaAsset;
