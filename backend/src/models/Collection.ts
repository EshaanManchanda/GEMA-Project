import mongoose, { Document, Schema } from 'mongoose';

export interface ICollection extends Document {
  title: string;
  description: string;
  icon: string; // OLD: URL to icon image (deprecated)
  iconAsset?: mongoose.Types.ObjectId; // NEW: MediaAsset ref
  count: string; // Display text like "45+ activities"
  category?: string; // Optional category filter
  events: mongoose.Types.ObjectId[]; // OLD: Associated event IDs (keep for backward compat)
  eventsData?: Array<{ // NEW: Embedded event documents
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
  dataVersion?: number; // For cache versioning
  lastSyncedAt?: Date; // Track last successful sync
  isActive: boolean;
  sortOrder: number; // For ordering collections
  slug: string; // URL-friendly slug
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string[];
    canonicalUrl?: string;
  };
  featuredImage?: string; // OLD: URL (deprecated)
  featuredImageAsset?: mongoose.Types.ObjectId; // NEW: MediaAsset ref
  createdAt: Date;
  updatedAt: Date;

  // Methods
  getEventCount(): Promise<number>;
}

const CollectionSchema: Schema<ICollection> = new Schema({
  title: {
    type: String,
    required: [true, 'Collection title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Collection description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  icon: {
    type: String,
    required: false, // Optional during migration
    trim: true
  },
  iconAsset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MediaAsset',
    required: false // Will become required after migration
  },
  count: {
    type: String,
    required: [true, 'Collection count display is required'],
    trim: true,
    maxlength: [50, 'Count text cannot exceed 50 characters']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: false // Optional during migration
  }],
  eventsData: [{
    _id: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    description: String,
    category: String,
    type: String,
    venueType: String,
    price: Number,
    currency: String,
    images: [String],
    imageAssets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MediaAsset' }],
    location: {
      city: String,
      address: String
    },
    dateSchedule: [{
      date: Date,
      startDate: Date,
      endDate: Date,
      startTime: String,
      endTime: String,
      availableSeats: Number,
      price: Number
    }],
    ageRange: [Number],
    isFeatured: Boolean,
    viewsCount: Number,
    averageRating: Number,
    isApproved: Boolean,
    isActive: Boolean,
    isDeleted: Boolean,
    status: String,
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    updatedAt: Date
  }],
  dataVersion: { type: Number, default: 1 },
  lastSyncedAt: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
  },
  seo: {
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [70, 'Meta title cannot exceed 70 characters'],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'Meta description cannot exceed 160 characters'],
    },
    metaKeywords: {
      type: [String],
      validate: {
        validator: function(v: string[]) {
          return v.length <= 10;
        },
        message: 'Cannot have more than 10 meta keywords',
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
    ref: 'MediaAsset',
    required: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
CollectionSchema.index({ slug: 1 }, { unique: true, sparse: true });
CollectionSchema.index({ isActive: 1, sortOrder: 1 });
CollectionSchema.index({ title: 'text', description: 'text' });
CollectionSchema.index({ 'eventsData._id': 1 }); // For event removal lookup
CollectionSchema.index({ lastSyncedAt: 1 }); // For cron job queries

// Virtual for populated events count
CollectionSchema.virtual('eventsCount', {
  ref: 'Event',
  localField: 'events',
  foreignField: '_id',
  count: true
});

// Method to get actual event count
CollectionSchema.methods.getEventCount = async function(): Promise<number> {
  const Event = mongoose.model('Event');
  return await Event.countDocuments({
    _id: { $in: this.events },
    isDeleted: false,
    isApproved: true
  });
};

// Pre-save middleware to update count display and generate slug
CollectionSchema.pre('save', async function(next) {
  // Generate slug from title if not provided
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Auto-generate SEO fields if not provided
  if (!this.seo.metaTitle) {
    this.seo.metaTitle = this.title.length > 70 ? `${this.title.substring(0, 67)}...` : this.title;
  }

  if (!this.seo.metaDescription) {
    this.seo.metaDescription = this.description.length > 160 ? `${this.description.substring(0, 157)}...` : this.description;
  }

  // Auto-populate icon URL from MediaAsset for backward compatibility
  if (this.isModified('iconAsset')) {
    if (this.iconAsset) {
      // iconAsset set - populate legacy icon field
      const MediaAsset = mongoose.model('MediaAsset');
      const asset = await MediaAsset.findById(this.iconAsset);
      if (asset) {
        this.icon = (asset as any).url;
      }
    } else {
      // iconAsset cleared - clear legacy icon field too
      this.icon = undefined;
    }
  }

  // Auto-populate featuredImage URL from MediaAsset for backward compatibility
  if (this.isModified('featuredImageAsset')) {
    if (this.featuredImageAsset) {
      // featuredImageAsset set - populate legacy featuredImage field
      const MediaAsset = mongoose.model('MediaAsset');
      const asset = await MediaAsset.findById(this.featuredImageAsset);
      if (asset) {
        this.featuredImage = (asset as any).url;
      }
    } else {
      // featuredImageAsset cleared - clear legacy featuredImage field too
      this.featuredImage = undefined;
    }
  }

  // Always update count display (not just when events modified)
  const eventCount = await this.getEventCount();
  this.count = `${eventCount}+ activities`;

  next();
});

export default mongoose.model<ICollection>('Collection', CollectionSchema);