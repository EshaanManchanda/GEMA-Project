import mongoose, { Document, Schema } from 'mongoose';

export interface IReel extends Document {
  // Core fields
  title: string;
  description?: string;

  // Video source type
  videoSourceType: 'uploaded' | 'youtube' | 'instagram';

  // Shadow fields for migration (old)
  videoUrl?: string;
  thumbnailUrl?: string;

  // MediaAsset references (new) - only for uploaded videos
  videoAsset?: mongoose.Types.ObjectId;
  thumbnailAsset?: mongoose.Types.ObjectId;

  // External video URLs - for YouTube/Instagram
  externalVideoUrl?: string;
  embedCode?: string;

  // Engagement metrics
  likes: number;
  viewsCount: number;
  shareCount: number;

  // Admin control
  visibility: 'public' | 'draft' | 'archived';
  isFeatured: boolean;
  displayOrder: number;

  // Metadata
  duration?: number; // Video duration in seconds
  tags: string[];

  // UI Configuration
  showLikeButton: boolean;
  showShareButton: boolean;
  showTitle: boolean;

  // Event linking
  linkedEvent?: mongoose.Types.ObjectId;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;

  // Helper methods
  extractYouTubeId(): string | null;
  extractInstagramId(): string | null;
}

const reelSchema = new Schema<IReel>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      minlength: [1, 'Title must be at least 1 character'],
      maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },

    // Video source type
    videoSourceType: {
      type: String,
      enum: {
        values: ['uploaded', 'youtube', 'instagram'],
        message: 'Video source type must be: uploaded, youtube, or instagram'
      },
      default: 'uploaded',
      required: true
    },

    // Shadow fields (backward compatibility)
    videoUrl: {
      type: String,
      trim: true
    },
    thumbnailUrl: {
      type: String,
      trim: true
    },

    // MediaAsset references - conditionally required for uploaded videos
    videoAsset: {
      type: Schema.Types.ObjectId,
      ref: 'MediaAsset',
      required: function(this: IReel) {
        return this.videoSourceType === 'uploaded';
      }
    },
    thumbnailAsset: {
      type: Schema.Types.ObjectId,
      ref: 'MediaAsset'
    },

    // External video URLs - for YouTube/Instagram
    externalVideoUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(this: IReel, v: string) {
          if (!v) return true;

          // Validate YouTube URLs
          if (this.videoSourceType === 'youtube') {
            return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(v);
          }

          // Validate Instagram URLs
          if (this.videoSourceType === 'instagram') {
            return /^https?:\/\/(www\.)?instagram\.com\/reel\/.+$/.test(v);
          }

          return true;
        },
        message: 'Invalid video URL format'
      }
    },
    embedCode: {
      type: String,
      trim: true
    },

    // Engagement metrics
    likes: {
      type: Number,
      default: 0,
      min: [0, 'Likes cannot be negative']
    },
    viewsCount: {
      type: Number,
      default: 0,
      min: [0, 'Views count cannot be negative']
    },
    shareCount: {
      type: Number,
      default: 0,
      min: [0, 'Share count cannot be negative']
    },

    // Admin control
    visibility: {
      type: String,
      enum: {
        values: ['public', 'draft', 'archived'],
        message: 'Visibility must be one of: public, draft, archived'
      },
      default: 'draft',
      required: true,
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, 'Display order cannot be negative']
    },

    // Metadata
    duration: {
      type: Number,
      min: [0, 'Duration cannot be negative']
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, 'Each tag cannot exceed 50 characters']
    }],

    // UI Configuration
    showLikeButton: {
      type: Boolean,
      default: true
    },
    showShareButton: {
      type: Boolean,
      default: true
    },
    showTitle: {
      type: Boolean,
      default: true
    },

    // Event linking
    linkedEvent: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      index: true
    },

    publishedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for efficient querying
reelSchema.index({ visibility: 1, displayOrder: 1, createdAt: -1 });

// Index for featured reels
reelSchema.index({ isFeatured: 1 });

// Index for popular reels
reelSchema.index({ viewsCount: -1 });

// Text search index for title, description, and tags
reelSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Pre-save middleware: Auto-set publishedAt when visibility changes to 'public'
reelSchema.pre('save', function(next) {
  if (this.isModified('visibility')) {
    if (this.visibility === 'public' && !this.publishedAt) {
      this.publishedAt = new Date();
    }
  }
  next();
});

// Post-save middleware: Cache invalidation
reelSchema.post('save', function(doc) {
  // Invalidate relevant caches (similar to Event model pattern)
  // TODO: Add cache invalidation logic when implementing Redis caching
  console.log(`[Reel] Cache invalidation needed for reel: ${doc._id}`);
});

// Post-delete middleware: Cache invalidation
reelSchema.post('deleteOne', function() {
  console.log(`[Reel] Cache invalidation needed after deleteOne: ${this.getQuery()._id}`);
});

reelSchema.post('deleteMany', function() {
  console.log(`[Reel] Cache invalidation needed after deleteMany`);
});

// Virtual field: videoUrl (backward compatibility)
reelSchema.virtual('videoUrlComputed').get(function() {
  // Prefer videoAsset.url, fallback to old videoUrl field
  if (this.populated('videoAsset') && typeof this.videoAsset === 'object') {
    return (this.videoAsset as any).url;
  }
  return this.videoUrl || '';
});

// Virtual field: thumbnailUrl (backward compatibility)
reelSchema.virtual('thumbnailUrlComputed').get(function() {
  // Prefer thumbnailAsset.url, fallback to old thumbnailUrl field
  if (this.populated('thumbnailAsset') && typeof this.thumbnailAsset === 'object') {
    return (this.thumbnailAsset as any).url;
  }
  return this.thumbnailUrl || '';
});

// Virtual field: embedUrl (for YouTube/Instagram embeds)
reelSchema.virtual('embedUrl').get(function() {
  if (this.videoSourceType === 'youtube') {
    const videoId = this.extractYouTubeId();
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }

  if (this.videoSourceType === 'instagram') {
    return this.externalVideoUrl;
  }

  return null;
});

// Helper method: Extract YouTube video ID from various URL formats
reelSchema.methods.extractYouTubeId = function(): string | null {
  if (this.videoSourceType !== 'youtube' || !this.externalVideoUrl) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/]+)/,
    /youtube\.com\/embed\/([^?/]+)/
  ];

  for (const pattern of patterns) {
    const match = this.externalVideoUrl.match(pattern);
    if (match) return match[1];
  }

  return null;
};

// Helper method: Extract Instagram reel ID
reelSchema.methods.extractInstagramId = function(): string | null {
  if (this.videoSourceType !== 'instagram' || !this.externalVideoUrl) return null;

  const match = this.externalVideoUrl.match(/instagram\.com\/reel\/([^/?]+)/);
  return match ? match[1] : null;
};

const Reel = mongoose.model<IReel>('Reel', reelSchema);

export default Reel;
