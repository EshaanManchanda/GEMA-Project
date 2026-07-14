import mongoose, { Document, Schema, model } from "mongoose";
import { IBlogCategory } from "./BlogCategory";
import { IMediaAsset } from "./MediaAsset";

export interface IBlog extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  rawHtmlContent?: string; // RAW HTML mode - bypasses TipTap parsing for complex layouts
  customCSS?: string; // Custom CSS per post - WordPress-like styling control
  featuredImage?: string; // OLD - deprecated, keep for backward compatibility
  featuredImageAsset?: mongoose.Types.ObjectId; // NEW - shadow field for migration
  category: mongoose.Types.ObjectId;
  vendorId?: mongoose.Types.ObjectId; // Optional attribution — set when a blog is posted on a vendor's behalf
  author: {
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
  };
  tags: string[];
  status: "draft" | "published" | "archived";
  featured: boolean;
  readTime: number;
  viewCount: number;
  likeCount: number;
  likedBy: mongoose.Types.ObjectId[];
  likedByIPs: string[];
  shareCount: number;
  commentsCount: number;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
  };
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const blogSchema = new Schema<IBlog>(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      lowercase: true,
      trim: true,
    },
    excerpt: {
      type: String,
      required: [true, "Blog excerpt is required"],
      trim: true,
      maxlength: [500, "Excerpt cannot exceed 500 characters"],
    },
    content: {
      type: String,
      required: [true, "Blog content is required"],
      // trim removed - HTML content must be preserved
    },
    rawHtmlContent: {
      type: String,
      required: false,
      default: null,
      // RAW HTML mode for complex layouts with iframes, semantic tags, inline styles
      // Bypasses TipTap parsing, rendered directly with DOMPurify sanitization only
    },
    customCSS: {
      type: String,
      required: false,
      default: null,
      // Custom CSS per post for WordPress-like styling control
      // Sanitized server-side to remove dangerous properties (@import, external url(), javascript:)
      maxlength: [50000, "Custom CSS cannot exceed 50,000 characters"],
    },
    featuredImage: {
      type: String,
      required: false, // Make optional during migration
    },
    featuredImageAsset: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: false, // Will become required after migration complete
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "BlogCategory",
      required: [true, "Blog category is required"],
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: "Vendor",
      required: false,
      index: true,
      // Attribution only — does NOT consume a VendorServicePackage blog_post slot.
      // Slot consumption is an explicit admin action (see admin.servicePackage.controller).
    },
    author: {
      name: {
        type: String,
        required: [true, "Author name is required"],
        trim: true,
      },
      email: {
        type: String,
        required: [true, "Author email is required"],
        lowercase: true,
        trim: true,
      },
      avatar: {
        type: String,
        trim: true,
      },
      bio: {
        type: String,
        trim: true,
        maxlength: [300, "Author bio cannot exceed 300 characters"],
      },
    },
    tags: {
      type: [String],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 20;
        },
        message: "Cannot have more than 20 tags",
      },
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    readTime: {
      type: Number,
      required: [true, "Read time is required"],
      min: [1, "Read time must be at least 1 minute"],
    },
    viewCount: {
      type: Number,
      default: 0,
      min: [0, "View count cannot be negative"],
    },
    likeCount: {
      type: Number,
      default: 0,
      min: [0, "Like count cannot be negative"],
    },
    likedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    likedByIPs: [
      {
        type: String,
        trim: true,
      },
    ],
    shareCount: {
      type: Number,
      default: 0,
      min: [0, "Share count cannot be negative"],
    },
    commentsCount: {
      type: Number,
      default: 0,
      min: [0, "Comments count cannot be negative"],
    },
    seo: {
      metaTitle: {
        type: String,
        trim: true,
        maxlength: [70, "Meta title cannot exceed 70 characters"],
      },
      metaDescription: {
        type: String,
        trim: true,
        maxlength: [160, "Meta description cannot exceed 160 characters"],
      },
      metaKeywords: {
        type: [String],
        validate: {
          validator: function (v: string[]) {
            return v.length <= 10;
          },
          message: "Cannot have more than 10 meta keywords",
        },
      },
      canonicalUrl: {
        type: String,
        trim: true,
      },
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
blogSchema.index({ title: 1 });
blogSchema.index({ slug: 1 }, { unique: true });
blogSchema.index({ status: 1 });
blogSchema.index({ category: 1 });
blogSchema.index({ featured: 1 });
blogSchema.index({ publishedAt: -1 });
blogSchema.index({ createdAt: -1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ "author.email": 1 });
blogSchema.index({ likedByIPs: 1 });

// Compound indexes for common queries
blogSchema.index({ status: 1, featured: -1, publishedAt: -1 });
blogSchema.index({ category: 1, status: 1, publishedAt: -1 });

// Pre-save middleware to generate slug and calculate read time
blogSchema.pre("save", function (next) {
  // Generate slug from title if not provided or title changed
  if (this.isModified("title") && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // Calculate read time based on content length (assuming 200 words per minute)
  if (this.isModified("content")) {
    const wordCount = this.content.trim().split(/\s+/).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  // Set publishedAt date when status changes to published
  if (
    this.isModified("status") &&
    this.status === "published" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }

  // Clear publishedAt if status is not published
  if (this.isModified("status") && this.status !== "published") {
    this.publishedAt = undefined;
  }

  // Auto-generate SEO fields if not provided
  if (!this.seo.metaTitle) {
    this.seo.metaTitle =
      this.title.length > 70 ? `${this.title.substring(0, 67)}...` : this.title;
  }

  if (!this.seo.metaDescription) {
    this.seo.metaDescription =
      this.excerpt.length > 160
        ? `${this.excerpt.substring(0, 157)}...`
        : this.excerpt;
  }

  next();
});

// Static method to increment view count
blogSchema.statics.incrementViewCount = function (blogId: string) {
  return this.findByIdAndUpdate(
    blogId,
    { $inc: { viewCount: 1 } },
    { new: true },
  );
};

// Static method to increment like count
blogSchema.statics.incrementLikeCount = function (blogId: string) {
  return this.findByIdAndUpdate(
    blogId,
    { $inc: { likeCount: 1 } },
    { new: true },
  );
};

// Static method to increment share count
blogSchema.statics.incrementShareCount = function (blogId: string) {
  return this.findByIdAndUpdate(
    blogId,
    { $inc: { shareCount: 1 } },
    { new: true },
  );
};

// Virtual for category details
blogSchema.virtual("categoryDetails", {
  ref: "BlogCategory",
  localField: "category",
  foreignField: "_id",
  justOne: true,
});

// Virtual for backward compatibility - prefer new field, fallback to old
blogSchema.virtual("featuredImageUrl").get(function () {
  if (this.featuredImageAsset && typeof this.featuredImageAsset === "object") {
    return (this.featuredImageAsset as any).url;
  }
  return this.featuredImage || "";
});

export const Blog = model<IBlog>("Blog", blogSchema);
