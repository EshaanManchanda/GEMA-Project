import mongoose, { Document, Schema } from "mongoose";

export interface ICollection extends Document {
  title: string;
  description: string;
  icon: string;
  iconAsset?: mongoose.Types.ObjectId;
  count: string;
  category?: string;
  events: mongoose.Types.ObjectId[];
  eventsData?: Array<{
    _id: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    category?: string;
    type?: string;
    venueType?: string;
    price?: number;
    currency?: string;
    images?: string[];
    imageAssets?: mongoose.Types.ObjectId[];
    location?: {
      city?: string;
      address?: string;
    };
    dateSchedule?: Array<{
      date?: Date;
      startDate?: Date;
      endDate?: Date;
      startTime?: string;
      endTime?: string;
      availableSeats?: number;
      price?: number;
    }>;
    ageRange?: [number, number];
    isFeatured?: boolean;
    viewsCount?: number;
    averageRating?: number;
    isApproved?: boolean;
    isActive?: boolean;
    isDeleted?: boolean;
    status?: string;
    vendorId?: mongoose.Types.ObjectId;
    updatedAt?: Date;
  }>;
  dataVersion?: number;
  lastSyncedAt?: Date;
  isActive: boolean;
  sortOrder: number;
  slug: string;
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
  };
  featuredImage?: string;
  featuredImageAsset?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  getEventCount(): Promise<number>;
}

const CollectionSchema: Schema<ICollection> = new Schema(
  {
    title: {
      type: String,
      required: [true, "Collection title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Collection description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    icon: {
      type: String,
      required: false,
      trim: true,
    },
    iconAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: false,
    },
    count: {
      type: String,
      required: [true, "Collection count display is required"],
      trim: true,
      maxlength: [50, "Count text cannot exceed 50 characters"],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, "Category cannot exceed 50 characters"],
    },
    events: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: false,
      },
    ],
    eventsData: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, required: true },
        title: { type: String, required: true },
        description: String,
        category: String,
        type: String,
        venueType: String,
        price: Number,
        currency: String,
        images: [String],
        imageAssets: [
          { type: mongoose.Schema.Types.ObjectId, ref: "MediaAsset" },
        ],
        location: {
          city: String,
          address: String,
        },
        dateSchedule: [
          {
            date: Date,
            startDate: Date,
            endDate: Date,
            startTime: String,
            endTime: String,
            availableSeats: Number,
            price: Number,
          },
        ],
        ageRange: [Number],
        isFeatured: Boolean,
        viewsCount: Number,
        averageRating: Number,
        isApproved: Boolean,
        isActive: Boolean,
        isDeleted: Boolean,
        status: String,
        vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor" },
        updatedAt: Date,
      },
    ],
    dataVersion: { type: Number, default: 1 },
    lastSyncedAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9-]+$/,
        "Slug can only contain lowercase letters, numbers, and hyphens",
      ],
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
    featuredImage: {
      type: String,
      trim: true,
    },
    featuredImageAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

CollectionSchema.index({ slug: 1 }, { unique: true, sparse: true });
CollectionSchema.index({ isActive: 1, sortOrder: 1 });
CollectionSchema.index({ title: "text", description: "text" });
CollectionSchema.index({ "eventsData._id": 1 });
CollectionSchema.index({ lastSyncedAt: 1 });

CollectionSchema.virtual("eventsCount", {
  ref: "Event",
  localField: "events",
  foreignField: "_id",
  count: true,
});

CollectionSchema.methods.getEventCount = async function (): Promise<number> {
  const Event = mongoose.model("Event");
  return await Event.countDocuments({
    _id: { $in: this.events },
    isDeleted: false,
    isApproved: true,
  });
};

CollectionSchema.pre("save", async function (next) {
  if (this.isModified("title") && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  if (!this.seo.metaTitle) {
    this.seo.metaTitle =
      this.title.length > 70 ? `${this.title.substring(0, 67)}...` : this.title;
  }

  if (!this.seo.metaDescription) {
    this.seo.metaDescription =
      this.description.length > 160
        ? `${this.description.substring(0, 157)}...`
        : this.description;
  }

  if (this.isModified("iconAsset")) {
    if (this.iconAsset) {
      const MediaAsset = mongoose.model("MediaAsset");
      const asset = await MediaAsset.findById(this.iconAsset);
      if (asset) {
        this.icon = (asset as any).url;
      }
    } else {
      this.icon = undefined;
    }
  }

  if (this.isModified("featuredImageAsset")) {
    if (this.featuredImageAsset) {
      const MediaAsset = mongoose.model("MediaAsset");
      const asset = await MediaAsset.findById(this.featuredImageAsset);
      if (asset) {
        this.featuredImage = (asset as any).url;
      }
    } else {
      this.featuredImage = undefined;
    }
  }

  const eventCount = await this.getEventCount();
  this.count = `${eventCount}+ activities`;

  next();
});

const Collection = mongoose.model<ICollection>("Collection", CollectionSchema);

export default Collection;
